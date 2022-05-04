import { Inject, Injectable } from "@tsed/di";
import { UseConnection } from "@tsed/typeorm";

import { AccountRepository } from "@repositories/AccountRepository";
import { LoggerService } from "@services/LoggerService";
import { SessionService } from "@services/SessionService";

import { Validate } from "@utils";
import { Config } from "@config";
import bcrypt from "bcryptjs";
import { initializeProviders } from "@config/providers";
import { IProvider } from "./../providers/IProvider";
import { AccountsService } from "./AccountsService";
import { EmailRepository } from "@repositories/EmailRepository";
import { TokenService } from "./TokenService";
import * as speakeasy from "speakeasy";
import { AccountEntity } from "@entities/Account";

@Injectable()
export class AuthService {
  private logger: LoggerService;
  private providers: IProvider[] = [];

  @Inject()
  @UseConnection("default")
  private accountRepository: AccountRepository;

  @Inject()
  @UseConnection("default")
  private emailRepository: EmailRepository;

  constructor(
    private loggerService: LoggerService,
    private accountsService: AccountsService,
    private tokenService: TokenService
  ) {
    this.logger = this.loggerService.child({
      label: { name: "AuthService", type: "service" },
    });
    this.providers = initializeProviders();
  }

  public signin(
    { email, password, captcha },
    session: SessionService
  ): Promise<any> {
    const ctx = this;
    let error = null;
    const errors = {
      email: null,
      password: null,
    };

    return new Promise(async (resolve, reject) => {
      if (
        Validate.isNull(email) ||
        Validate.isEmpty(email) ||
        Validate.isUndefined(email)
      ) {
        ctx.logger.error("Account email missing", null, true);
        if (!errors.email) {
          errors.email = "ACCOUNT_EMAIL_MISSING";
        }
      }

      if (!Validate.isEmail(email)) {
        ctx.logger.error("Invalid email", null, true);
        if (!errors.email) {
          errors.email = "ACCOUNT_EMAIL_INVALID";
        }
      }

      if (
        Validate.isNull(password) ||
        Validate.isEmpty(password) ||
        Validate.isUndefined(password)
      ) {
        ctx.logger.error("Account password missing", null, true);
        if (!errors.password) {
          errors.password = "ACCOUNT_PASSWORD_MISSING";
        }
      }

      const account = await ctx.accountsService.getAccountByPrimaryEmail(email);

      if (!account) {
        ctx.logger.error("Account doesn't exists", null, true);
        error = "ACCOUNT_NOT_EXIST";
        return resolve({ type: "error", error, errors });
      }

      if (errors.password || errors.email) {
        return resolve({ type: "error", error, errors });
      }

      if (Validate.isNull(account.password)) {
        return resolve({
          type: "error",
          error:
            "Auth failed, sign in with data provider connected to your account.",
          errors,
        });
      }

      if (account && !account.verifyPassword(password)) {
        ctx.logger.error("Invalid account password", null, true);
        if (!errors.password) {
          errors.password = "ACCOUNT_PASSWORD_INVALID";
        }
        return resolve({
          type: "error",
          error: "ACCOUNT_PASSWORD_INVALID",
          errors,
        });
      }

      if (!account.isPrimaryEmailVerified()) {
        ctx.logger.error("Account email doesn't verified", null, true);
        return resolve({ type: "error", error: "ACCOUNT_EMAIL_NOT_VERIFIED" });
      }

      if (account.banned) {
        ctx.logger.error("Account banned", null, true);
        return resolve({ type: "error", error: "ACCOUNT_BANNED" });
      }

      // IN THIS MOMENT USER IS LOGGED SUCCESSFUL

      ctx.logger.success(
        account.username + " logged successful in OAuth",
        null,
        true
      );

      const auth_time = Math.floor(Date.now() / 1000);

      const accountSessionExists = session.checkAccountSessionExists(
        account.uuid
      );
      this.logger.info(JSON.stringify(accountSessionExists));
      if (!accountSessionExists) {
        const newSession = await this.accountsService.addSession({
          session_id: session.getSession.id,
          session_issued: new Date(),
          session_expires: session.getSession.cookie.expires,
          account: account,
          amr: ["pwd"],
          idp: "local",
        });

        session.addBrowserSession({
          uuid: newSession.uuid,
          session_id: newSession.session_id,
          session_issued: newSession.session_issued,
          session_expires: newSession.session_expires,
          amr: newSession.amr,
          idp: newSession.idp,
          account: {
            uuid: account.uuid,
            email: account.getPrimaryEmail(),
            username: account.username,
            picture: account.avatar,
            role: account.role,
          },
        });
        session.setCurrentSessionUuid(newSession.uuid);
      } else {
        session.setCurrentSessionUuid(accountSessionExists.uuid);
      }

      session.setIDP({
        auth_time: auth_time,
        reauth_time: auth_time,
        used_authn_methods: [],
      });

      await session.saveSession();

      resolve({
        type: "logged-in",
      });
    });
  }

  public reauth(data: ReAuthData, session: SessionService): Promise<any> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const { email, password, captcha, ip, country, city } = data;

      if (
        Validate.isNull(email) ||
        Validate.isEmpty(email) ||
        Validate.isUndefined(email)
      ) {
        ctx.logger.error(
          "Account email missing in session, try logout and login again",
          null,
          true
        );
        return resolve({ type: "error", error: "ACCOUNT_EMAIL_MISSING" });
      }

      if (!Validate.isEmail(email)) {
        ctx.logger.error("Invalid email", null, true);
        return resolve({ type: "error", error: "ACCOUNT_EMAIL_INVALID" });
      }

      if (Validate.isEmpty(password) || Validate.isUndefined(password)) {
        ctx.logger.error("Account password missing", null, true);
        return resolve({ type: "error", error: "ACCOUNT_PASSWORD_MISSING" });
      }

      const account = await ctx.accountsService.getAccountByPrimaryEmail(email);

      if (!account) {
        ctx.logger.error("Account doesn't exist", null, true);
        return resolve({ type: "error", error: "ACCOUNT_NOT_EXIST" });
      }

      if (!bcrypt.compareSync(password, account.password)) {
        ctx.logger.error("Invalid account password", null, true);
        return resolve({ type: "error", error: "ACCOUNT_PASSWORD_INVALID" });
      }

      if (account.banned) {
        ctx.logger.error("Account banned", null, true);
        return resolve({ type: "error", error: "ACCOUNT_BANNED" });
      }

      ctx.logger.success(
        account.username + " relogged successful in OAuth",
        null,
        true
      );

      // todo: refactor

      // const auth_time = Math.floor(Date.now() / 1000);

      // session.setUser({
      //   logged: true,
      //   id: account.uuid,
      //   username: account.username,
      //   email: account.getPrimaryEmail(),
      //   picture: Config.CDN.url + "/avatars/" + account.uuid,
      //   role: account.role,
      // });

      // session.setIDP({
      //   ...session.getIDP,
      //   reauth_time: auth_time,
      // });

      // session.saveSession();

      // resolve({
      //   type: "logged-in"
      // })
    });
  }

  public async chooseAccount(
    { account_uuid },
    session: SessionService
  ): Promise<any> {
    const ctx = this;
    let error = null;
    const errors = {
      email: null,
      password: null,
    };

    if (
      Validate.isNull(account_uuid) ||
      Validate.isEmpty(account_uuid) ||
      Validate.isUndefined(account_uuid)
    ) {
      throw new Error("ACCOUNT_UUID_MISSING");
    }

    const foundSession = session.checkAccountSessionExists(account_uuid);

    if (!foundSession) {
      throw new Error("ACCOUNT_SESSION_NOT_EXIST");
    }

    const account = await ctx.accountsService.getByUUIDWithRelations(
      account_uuid,
      ["emails"]
    );

    if (!account) {
      throw new Error("ACCOUNT_NOT_EXIST");
    }

    if (!account.isPrimaryEmailVerified()) {
      throw new Error("ACCOUNT_EMAIL_NOT_VERIFIED");
    }

    // IN THIS MOMENT USER IS LOGGED SUCCESSFUL

    const auth_time = Math.floor(Date.now() / 1000);

    session.setCurrentSessionUuid(foundSession.uuid);

    session.setIDP({
      auth_time: auth_time,
      reauth_time: auth_time,
      used_authn_methods: [],
    });

    await session.saveSession();

    return {
      type: "logged-in",
    };
  }

  public getProviders() {
    return this.providers;
  }

  public async checkMfaAuthnRequired(
    accountId: string,
    session: SessionService,
    acr_values: string = "urn:rutsukun:bronze"
  ) {
    const account = await this.accountsService.getByUUIDWithRelations(
      accountId,
      ["authn_methods"]
    );
    const enabledMethod = account.authn_methods.find((m) => !!m.enabled);

    if (account.authn_methods.length && enabledMethod) {
      if (acr_values === "urn:rutsukun:bronze") return null;
      if (
        session.getIDP.used_authn_methods.find(
          (m) => m.method === enabledMethod.type
        )
      )
        return null;

      return {
        type: "multifactor",
        multifactor: {
          type: enabledMethod.type,
          token: await this.tokenService.createMfaToken(
            account.uuid,
            enabledMethod.type
          ),
        },
      };
    } else {
      return null;
    }
  }

  public async multifactor(
    code: string,
    token: string,
    session: SessionService
  ): Promise<any> {
    const { valid, data } = this.tokenService.verifyMfaToken(token);

    if (valid && data.multifactor.type === "OTP") {
      const accountId = data.multifactor.accountId;

      const account = await this.accountsService.getByUUIDWithRelations(
        accountId,
        ["authn_methods"]
      );
      const method = account.authn_methods.find((m) => m.type === "OTP");

      if (accountId !== account.uuid) {
        return { type: "error", error: "TOKEN_ACCOUNT_INVALID" };
      }

      const verified = speakeasy.totp.verify({
        secret: method.data.secret,
        encoding: "base32",
        token: code,
      });

      if (verified) {
        session.setIDP({
          ...session.getIDP,
          used_authn_methods: [
            ...session.getIDP.used_authn_methods,
            {
              method: "OTP",
              first_used_date: new Date(),
              last_used_date: new Date(),
            },
          ],
        });

        await session.saveSession();

        return { type: "logged-in" };
      } else {
        return { type: "error", error: "INVALID_CODE" };
      }
    } else {
      return { type: "error", error: "INVALID_MULTIFACTOR_TYPE" };
    }
  }

  async authWithProvider(
    providerId: string,
    account: AccountEntity,
    session: SessionService
  ) {
    const accountSessionExists = session.checkAccountSessionExists(
      account.uuid
    );
    if (accountSessionExists) {
      session.setCurrentSessionUuid(accountSessionExists.uuid);
      session.delAction();
      await session.saveSession();
      return true;
    }

    const newSession = await this.accountsService.addSession({
      session_id: session.getSession.id,
      session_issued: new Date(),
      session_expires: session.getSession.cookie.expires,
      account: account,
      idp: providerId, // identity provider
      amr: [providerId],
    });

    session.addBrowserSession({
      uuid: newSession.uuid,
      session_id: newSession.session_id,
      session_issued: newSession.session_issued,
      session_expires: newSession.session_expires,
      amr: newSession.amr,
      idp: newSession.idp,
      account: {
        uuid: account.uuid,
        email: account.getPrimaryEmail(),
        username: account.username,
        picture: account.avatar,
        role: account.role,
      },
    });
    session.setCurrentSessionUuid(newSession.uuid);
    session.delAction();
    await session.saveSession();
  }
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
