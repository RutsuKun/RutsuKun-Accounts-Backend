import { Request, Response } from "express";
import { URLSearchParams } from "url";
import { verifyChallenge } from "pkce-challenge";

import { Inject, Injectable } from "@tsed/di";
import { UseConnection } from "@tsed/typeorm";

import { OAuthDeviceCodeRepository } from "@repositories/OAuthRepository";
import { AccountRepository } from "@repositories/AccountRepository";

import {
  ICreateIDTokenData,
  TokenService,
  CreateAccessTokenData,
  CreateRefreshTokenData,
} from "@services/TokenService";
import { LoggerService } from "@services/LoggerService";
import { SessionService } from "@services/SessionService";
import { ClientService } from "@services/ClientService";

import { OAuthDeviceCode } from "@entities/OAuthDeviceCode";

import { Config } from "@config";
import crypto from "crypto";
import { AccountsService } from "./AccountsService";
import { AccountEntity } from "@entities/Account";
import { IAcl } from "common/interfaces/acl.interface";
import { AclService } from "./AclService";

import _ from "lodash";
import { OAuthAuthorizationRepository } from "@repositories/OAuthAuthorizationRepository";
import { ClientEntity } from "@entities/Client";
import { OAuthScope } from "@entities/OAuthScope";
import { ScopeService } from "./ScopeService";

@Injectable()
export class OAuth2Service {
  private name = "Authentication Server (OAuth2 + OpenID Connect)";
  private running: boolean;
  private logger: LoggerService;

  @Inject()
  @UseConnection("default")
  private accountRepository: AccountRepository;

  @Inject()
  @UseConnection("default")
  private oauthDeviceCode: OAuthDeviceCodeRepository;

  @Inject()
  @UseConnection("default")
  private oauthAuthorizationRepository: OAuthAuthorizationRepository;

  constructor(
    private loggerService: LoggerService,
    private sessionService: SessionService,
    private tokenService: TokenService,
    private clientService: ClientService,
    private accountsService: AccountsService,
    private aclService: AclService,
    private scopeService: ScopeService
  ) {
    this.logger = this.loggerService.child({
      label: {
        type: "auth",
        name: "Auth Manager",
      },
    });
  }

  public async checkConsent(
    req: Request,
    res: Response,
    session: SessionService
  ) {
    const clientFromSession = session.getClient;
    const clientFromQuery = session.getClientQuery;
    const { ip, country, city, eu } = req.ipInfo;

    const client = await this.clientService.getClientByClientId(
      clientFromSession.client_id
    );
    const account = await this.accountsService.getAccountByUUID(
      session.getCurrentSessionAccount.uuid
    );

    const { needConsent } = await this.needAuthorizationConsent(
      client,
      account,
      clientFromQuery.scope.split(" ")
    );

    if (clientFromSession) {
      if (clientFromSession.consent || needConsent) {
        const consent = {
          scope: clientFromQuery.scope,
          client: {
            client_id: clientFromSession.client_id,
            client_name: clientFromSession.name,
            client_uri: clientFromSession.website,
            redirect_uri: clientFromQuery.redirect_uri,
            verified: clientFromSession.verified,
            // logo_uri: `http://cdn.auth.local/clients/logo/${clientFromSession.client_id}`,
            logo_uri: `${clientFromSession.logo}`,
            policy_uri: clientFromSession.privacy_policy || null,
            tos_uri: clientFromSession.tos || null,
          },
        };
        return {
          type: "consent",
          consent: consent,
        };
      } else {
        //TEST!!!!

        const userId = session.getCurrentSessionAccount.uuid;
        const userUsername = session.getCurrentSessionAccount.username;

        this.logger.info(
          "Authorization in progress for " + userUsername + " (" + userId + ")"
        );

        let scopeToAuthorize = session.getClientQuery.scope.split(" ");

        const account = await this.accountsService.getByUUIDWithRelations(
          session.getCurrentSessionAccount.uuid,
          ["groups"]
        );

        const acl = await this.aclService.getAcl(
          session.getClientQuery.client_id
        );

        scopeToAuthorize = this.filterAllowedScopes(
          account,
          acl,
          scopeToAuthorize
        );

        const data = await this.authorize({
          response_type: clientFromQuery.response_type,
          redirect_uri: clientFromQuery.redirect_uri,
          scopes: scopeToAuthorize,
          accountId: userId,
          country,
          code_challenge: clientFromQuery.code_challenge,
          code_challenge_method: clientFromQuery.code_challenge_method,
          nonce: clientFromQuery.nonce,
          state: clientFromQuery.state,
          client: clientFromSession,
          consentGiven: true,
          session_state: req.session.id,
        });

        switch (data.type) {
          case "response":
            this.logger.success(
              "Authorized  " + userUsername + " (" + userId + ")"
            );
            this.logger.info("Response Type: " + data.type);
            this.logger.info("Response Mode: " + data.response.mode);
            this.logger.info(
              "Response Parameter URI: " + data.response.parameters.uri
            );
            return data;
            break;
          case "error":
            return {
              type: "error",
              error: data.error,
            };
            break;
        }
      }
    } else {
      return {
        type: "logged-in",
      };
    }
  }

  public authorize(data: OAuth2AuthorizeData): Promise<any> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const {
        response_type,
        redirect_uri,
        accountId,
        country,
        code_challenge,
        code_challenge_method,
        nonce,
        state,
        scopes,
        client,
        consentGiven,
        session_state,
        deviceCodeData,
      } = data;

      if (deviceCodeData) {
        const toSaveDeviceCode: OAuthDeviceCode = {
          ...deviceCodeData,
          authorized: true,
          user_uuid: accountId,
        };
        await this.oauthDeviceCode.save(toSaveDeviceCode);

        return resolve({ type: "authorized" });
      }

      ctx.logger.info("SESSION STATE: " + session_state);

      if (consentGiven) {
        const account = await ctx.accountsService.getByUUIDWithRelations(
          accountId,
          ["emails"]
        );

        const _client = await this.clientService.getClientByClientId(
          client.client_id
        );

        const hasAuthorization = await this.hasAuthorization(_client, account);

        if (!hasAuthorization) {
          const foundScopes = await this.scopeService.getScopesEntities(scopes);
          console.log("foundScopes entities ", foundScopes);

          await this.createAuthorization(_client, account, foundScopes);
        }

        // const scopes = await ctx.settings.getScopesByRole(account.role);
        let IDTokenData: ICreateIDTokenData = {
          sub: account.uuid,
          username: account.username,
          picture: `${Config.CDN.url}/${account.uuid}`,
          email: account.getPrimaryEmail(),
          role: account.role,
          banned: account.banned,
          client_id: client.client_id,
          scopes: scopes,
          country: country,
          nonce: nonce,
        };

        const AccessTokenData: CreateAccessTokenData = {
          sub: account.uuid,
          client_id: client.client_id,
          scopes: scopes,
        };

        const CodeData = {
          sub: account.uuid,
          client_id: client.client_id,
          code_challenge: code_challenge,
          code_challenge_method: code_challenge_method,
          scopes: scopes,
          state,
          nonce: nonce,
        };

        let res: any = {};

        const response_types_check = response_type.split(" ");
        response_types_check.forEach((item, index) => {
          if (!client.response_types.includes(item)) {
            ctx.logger.warn(
              "CLIENT_RESPONSE_TYPE_INVALID: " + response_type,
              null,
              true
            );
            return resolve({
              type: "error",
              error: "CLIENT_RESPONSE_TYPE_INVALID",
            });
          }
        });

        if (response_types_check.includes("code")) {
          const code = await ctx.tokenService.createCodeToken(CodeData);
          res.code = code;
          IDTokenData.c_hash = ctx.tokenService.createCHash(code, "RS256");
        }

        if (response_types_check.includes("id_token")) {
          const id_token = await ctx.tokenService.createIDToken(IDTokenData);
          res.id_token = id_token;
        }

        if (response_types_check.includes("token")) {
          const access_token = await ctx.tokenService.createAccessToken(
            AccessTokenData
          );
          res.access_token = access_token;
          res.token_type = "Bearer";
          IDTokenData.at_hash = ctx.tokenService.createAtHash(
            access_token,
            "RS256"
          );
        }

        if (state) {
          res.state = state;
          IDTokenData.s_hash = ctx.tokenService.createSHash(state, "RS256");
        }

        if (
          scopes.includes("offline_access") &&
          !response_types_check.includes("code")
        ) {
          const RefreshTokenData: CreateRefreshTokenData = {
            sub: account.uuid,
            client_id: client.client_id,
            scopes: scopes,
          };

          const rv1 = Math.floor(Math.random() * Math.floor(254));
          const rv2 = Math.random().toString(36).substr(2, 12);
          const rv3 = Math.floor(Math.random() * Math.floor(81458));
          RefreshTokenData.jti = rv1 + "-" + rv2 + "-" + rv3;
          const refresh_token = await ctx.tokenService.createRefreshToken(
            RefreshTokenData
          );
          res.refresh_token = refresh_token;
          res.refresh_token_type = "Bearer";
        }

        if (session_state) res.session_state = session_state;

        const params = new URLSearchParams(res);

        console.log("params", params);

        if (response_types_check.includes("id_token")) {
          resolve({
            type: "response",
            response: {
              mode: "fragment",
              parameters: {
                uri: redirect_uri + "#" + params,
              },
            },
            country,
          });
        } else {
          resolve({
            type: "response",
            response: {
              mode: "query",
              parameters: {
                uri: redirect_uri + "?" + params,
              },
            },
            country,
          });
        }
      } else {
        const params = new URLSearchParams({
          error: "consent_required",
          description: "Consent required",
          state: state,
        });

        resolve({
          type: "response",
          response: {
            mode: "query",
            parameters: {
              uri: redirect_uri + "?" + params,
            },
          },
          country,
        });
      }
    });
  }

  public filterAllowedScopes(
    account: AccountEntity,
    acl: IAcl,
    scopes: string[]
  ) {
    if (!acl || !acl.allowedScopes.length) return [];

    let aclAllowedScopes: string[] = [];
    let accountAllowedScopes: string[] = [];
    let groupsAllowedScopes: string[] = [];

    const aclScopes = acl.allowedScopes;

    const aclUnallowedScopes = !!aclScopes.length
      ? scopes.filter((filteredScope) => !aclScopes.includes(filteredScope))
      : [];

    console.log(
      "aclUnallowedScopes",
      aclUnallowedScopes.length ? aclUnallowedScopes.join(", ") : "none"
    );

    aclAllowedScopes = !!acl.allowedScopes.length
      ? scopes.filter((filteredScope) =>
          acl.allowedScopes.includes(filteredScope)
        )
      : [];

    const accountHasAccess = acl.allowedAccounts.find(
      (a) => a.uuid === account.uuid
    );
    if (acl.allowedAccounts.length && accountHasAccess) {
      const accountUnallowedScopes = scopes.filter(
        (filteredScope) =>
          !accountHasAccess.allowedScopes.includes(filteredScope)
      );

      console.log(
        "accountUnallowedScopes",
        accountUnallowedScopes.length
          ? accountUnallowedScopes.join(", ")
          : "none"
      );

      accountAllowedScopes = scopes.filter((filteredScope) =>
        accountHasAccess.allowedScopes.includes(filteredScope)
      );

      console.log(
        "accountAllowedScopes",
        accountAllowedScopes.length ? accountAllowedScopes.join(", ") : "none"
      );
    }

    const groupsHasAccess = acl.allowedGroups.filter((a) =>
      account.groups.find((accountGroup) => accountGroup.name === a.name)
    );
    if (acl.allowedGroups.length && groupsHasAccess.length) {
      let arrayOfScopes = groupsHasAccess.map((group) => group.allowedScopes);

      console.log("arrayOfScopes", arrayOfScopes);

      if (arrayOfScopes.length) {
        const hasAnyScopes = arrayOfScopes.filter((a) => a.length);

        console.log("hasAnyScopes", hasAnyScopes);

        if (!hasAnyScopes.length) {
          groupsAllowedScopes = scopes;
        } else {
          let tempGroupsAllowedScopes = arrayOfScopes.join().split(",");
          groupsAllowedScopes = _.union(tempGroupsAllowedScopes);
          groupsAllowedScopes = scopes.filter((filteredScope) =>
            groupsAllowedScopes.includes(filteredScope)
          );
        }
      }

      console.log(
        "groupsAllowedScopes",
        groupsAllowedScopes.length ? groupsAllowedScopes.join(", ") : "none"
      );
    }

    let finalAllowedScopes;
    if (!acl.allowedAccounts.length && !acl.allowedGroups.length) {
      finalAllowedScopes = aclAllowedScopes;
    } else {
      finalAllowedScopes = [...accountAllowedScopes, ...groupsAllowedScopes];

      finalAllowedScopes = finalAllowedScopes.filter((filteredScope) =>
        aclAllowedScopes.includes(filteredScope)
      );
    }

    console.log(
      "finalAllowedScopes",
      finalAllowedScopes.length ? finalAllowedScopes.join(", ") : "none"
    );

    return finalAllowedScopes;
  }

  public getToken(data: GetTokenData) {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      // const = data;
      ctx.logger.info("Client: " + data.client.client_id, null, true);
      switch (data.grant_type) {
        case "authorization_code":
          ctx.logger.info(
            data.code_verifier
              ? "Initialized Authorization Code flow with PKCE."
              : "Initialized Authorization Code flow.",
            null,
            true
          );

          if (
            !(await ctx.clientService.checkClientRedirectUri(
              data.client,
              data.redirect_uri
            ))
          ) {
            ctx.logger.error(
              "Client invalid redirect_uri: " + data.redirect_uri,
              null,
              true
            );
            return reject({
              error: "invalid_client",
              error_description: "Invalid redirect_uri",
            });
          }

          if (
            !data.code_verifier &&
            !(await ctx.clientService.checkClientSecret(
              data.client,
              data.clientSecret
            ))
          ) {
            return reject({
              error: "invalid_client",
              error_description: "Invalid client credentials",
            });
          }

          if (!data.code) {
            return reject({
              error: "invalid_request",
              error_description: "Invalid request",
            });
          }

          try {
            ctx.logger.info(
              "Authorization code validation in progress.",
              null,
              true
            );
            const decoded: any = await ctx.tokenService.verifyCodeToken(
              data.code
            );

            if (!decoded) {
              ctx.logger.error("Authorization code expired.", null, true);
              return reject({
                error: "invalid_request",
                error_description: "Invalid request",
              });
            }

            ctx.logger.success("Authorization code is fine.", null, true);
            const account = await ctx.accountRepository.findByUUID(decoded.sub);
            const scopes = decoded.scopes;
            const state = decoded.state;

            ctx.logger.info(
              "Generates an Access Token for " +
                account.username +
                " (" +
                account.uuid +
                ")",
              null,
              true
            );
            const access_token = await ctx.tokenService.createAccessToken({
              sub: account.uuid,
              client_id: data.client.client_id,
              scopes: scopes,
            });

            ctx.logger.success("Access Token generated: " + access_token);

            ctx.logger.info(
              "Generates an ID Token for " +
                account.username +
                " (" +
                account.uuid +
                ")",
              null,
              true
            );

            const at_hash = ctx.tokenService.createAtHash(
              access_token,
              "RS256"
            );
            const c_hash = ctx.tokenService.createCHash(data.code, "RS256");
            const s_hash = ctx.tokenService.createSHash("12345", "RS256");
            const id_token = await ctx.tokenService.createIDToken({
              sub: account.uuid,
              username: account.username,
              picture: account.avatar,
              email: account.getPrimaryEmail(),
              role: account.role,
              banned: account.banned,
              client_id: data.client.client_id,
              country: data.country,
              scopes: scopes,
              amr: ["pw"],
              acr: "urn:raining:bronze",
              azp: ["raining_auth"],
              at_hash: at_hash,
              c_hash: c_hash,
              s_hash: s_hash,
              nonce: decoded.nonce,
            });

            ctx.logger.success("ID Token generated: " + id_token);

            if (decoded.code_challenge) {
              ctx.logger.info("Verify a code challenge in progress.");
              const verified = verifyChallenge(
                data.code_verifier,
                decoded.code_challenge
              );
              if (!verified) {
                ctx.logger.error("Code challenge verify failed.", null, true);
                return reject({
                  error: "invalid_client",
                  error_description: "Invalid client credentials",
                });
              }
              ctx.logger.success("Code challenge verified.", null, true);
            }

            return resolve({
              access_token: access_token,
              type: "Bearer",
              expires_in: Config.Token.AccessTokenExp,
              id_token: id_token,
            });
          } catch (err) {
            console.log(err);
            ctx.logger.error(err, null, true);
            return reject({
              error: "access_denied",
              error_descriptio: "Invalid request",
            });
          }

          break;
        case "client_credentials":
          ctx.logger.info("Initialized Client Credentials flow.", null, true);

          if (
            !(await ctx.clientService.checkClientSecret(
              data.client,
              data.clientSecret
            ))
          ) {
            return reject("invalid_request");
          }

          ctx.logger.info("Client Secret is fine");

          ctx.logger.info(
            "Generates an Access Token for " +
              data.client.name +
              " (" +
              data.client.client_id +
              ")",
            null,
            true
          );
          const access_token = await ctx.tokenService.createAccessToken({
            sub: data.client.client_id,
            client_id: data.client.client_id,
            scopes: data.scope.split(" "),
          });

          ctx.logger.success("Access Token generated: " + access_token);

          return resolve({
            access_token: access_token,
            type: "Bearer",
            expires_in: Config.Token.AccessTokenExp,
            scope: data.scope,
          });

          break;
        case "device_code":
          const scopes = data.deviceCodeData.scope
            ? data.deviceCodeData.scope.split(" ")
            : [];
          const user_uuid = data.deviceCodeData.user_uuid;

          ctx.logger.info("Initialized Device Code flow.", null, true);

          try {
            ctx.logger.success("Authorization code is fine.", null, true);
            const account = await ctx.accountRepository.findByUUID(user_uuid);

            ctx.logger.info(
              "Generates an Access Token for " +
                account.username +
                " (" +
                account.uuid +
                ")",
              null,
              true
            );
            const access_token = await ctx.tokenService.createAccessToken({
              sub: account.uuid,
              client_id: data.client.client_id,
              scopes: scopes,
            });

            ctx.logger.success("Access Token generated: " + access_token);

            let id_token = null;

            if (scopes.includes("openid")) {
              ctx.logger.info(
                "Generates an ID Token for " +
                  account.username +
                  " (" +
                  account.uuid +
                  ")",
                null,
                true
              );

              const at_hash = ctx.tokenService.createAtHash(
                access_token,
                "RS256"
              );

              const s_hash = ctx.tokenService.createSHash("12345", "RS256");

              const IDTokenData = {
                sub: account.uuid,
                username: account.username,
                picture: account.avatar,
                email: account.getPrimaryEmail(),
                role: account.role,
                banned: account.banned,
                client_id: data.client.client_id,
                scopes: scopes,
                amr: ["pw"],
                acr: "urn:raining:bronze",
                azp: ["raining_auth"],
                at_hash: at_hash,
                s_hash: s_hash,
                nonce: "123",
              };

              if (data.country) IDTokenData["country"] = data.country;

              id_token = await ctx.tokenService.createIDToken(IDTokenData);

              ctx.logger.success("ID Token generated: " + id_token);
            }

            const response = {
              access_token: access_token,
              type: "Bearer",
              expires_in: Config.Token.AccessTokenExp,
              scope: scopes.join(" "),
            };

            if (id_token) response["id_token"] = id_token;
            return resolve(response);
          } catch (err) {
            console.log(err);
            ctx.logger.error(err, null, true);
            return reject({
              error: "access_denied",
              error_descriptio: "Invalid request",
            });
          }

          break;

          break;
        default:
          ctx.logger.error("Invalid grant type", null, true);
          reject("unsupported_grant_type");
          break;
      }
    });
  }

  public async runDeviceCodeFlow(client_id, scope) {
    // const find = await this.oauthDeviceCode.getOneByClientID(client_id);
    // if (find) {
    //   return find.getEndpointData();
    // } else {
    const device_code = await crypto.randomBytes(15).toString("hex");
    const user_code = await crypto.randomBytes(4).toString("hex").toUpperCase();
    const data: OAuthDeviceCode = {
      client_id: client_id,
      scope: scope,
      device_code: device_code,
      user_code: `${user_code.substring(0, 4)}-${user_code.substring(4)}`,
      interval: 5,
      expires_at: Math.round(Date.now() / 1000) + 1800,
    };

    await this.oauthDeviceCode.save(data);
    const find = await this.oauthDeviceCode.findOne({
      device_code: data.device_code,
    });

    return find.getEndpointData();
    // }
  }

  async getDeviceToken(device_code: string, client_id: string) {
    const findDeviceToken = await this.oauthDeviceCode.findOne({
      device_code,
      client_id,
    });

    return findDeviceToken;
  }

  async getDeviceTokenByUserCode(user_code: string) {
    const findDeviceToken = await this.oauthDeviceCode.findOne({
      user_code,
    });
    return findDeviceToken;
  }

  async getAuthorizations() {
    return this.oauthAuthorizationRepository.findAll();
  }

  async hasAuthorization(client: ClientEntity, account: AccountEntity) {
    return this.oauthAuthorizationRepository.findOne({
      where: {
        account: {
          uuid: account.uuid,
        },
        client: {
          client_id: client.client_id,
        },
      },
      relations: ["account", "client", "scopes"],
    });
  }

  createAuthorization(
    client: ClientEntity,
    account: AccountEntity,
    scopes: OAuthScope[]
  ) {
    return this.oauthAuthorizationRepository.save({
      account,
      client,
      scopes,
    });
  }

  async needAuthorizationConsent(
    client: ClientEntity,
    account: AccountEntity,
    scopes: string[]
  ) {
    const foundAuthorization = await this.hasAuthorization(client, account);

    console.log("foundAuthorization", !!foundAuthorization);

    if (foundAuthorization) {
      const proccessNewScopes = scopes.filter(
        (scope) => !foundAuthorization.scopes.find((s) => s.name === scope)
      );

      console.log("proccessNewScopes", proccessNewScopes);

      return { needConsent: !!proccessNewScopes.length };
    }

    return { needConsent: true };
  }
}

interface OAuth2AuthorizeData {
  response_type?: string;
  redirect_uri?: string;
  scopes?: string[];
  accountId: string;
  country?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  nonce?: string;
  state?: string;
  client: any;
  consentGiven: boolean;
  session_state?: string;

  deviceCodeData?: OAuthDeviceCode;
}

interface GetTokenData {
  grant_type: "authorization_code" | "client_credentials" | "device_code";
  redirect_uri: string;
  code: string;
  clientSecret: string;
  code_verifier: string;
  country?: string;
  city?: string;
  ip?: string;
  client: any;
  scope: string;

  deviceCodeData?: OAuthDeviceCode;
}

export interface SigninData {
  email: string;
  password: string;
  captcha?: string;
}

export interface ReAuthData {
  type?: string;
  email: string;
  password: string;
  ip?: string;
  country?: string;
  city?: string;
  captcha: string;
}

export interface MultifactorData {
  type?: string;
  code: string;
  provider?: string;
  ip?: string;
  country?: string;
  city?: string;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
  repassword: string;
}

export interface UserData {
  name?: string;
  email: string;
  password: string;
}

export interface ResData {
  access_token?: string;
  type?: string;
  id_token?: string;
  code?: string;
  state?: string;
  nonce?: string;
}
