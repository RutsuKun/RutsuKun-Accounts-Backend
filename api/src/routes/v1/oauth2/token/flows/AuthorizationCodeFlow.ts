import { Req, Res } from "@tsed/common";
import { verifyChallenge } from "pkce-challenge";
import { AccountsService } from "@services/AccountsService";
import { ClientService } from "@services/ClientService";
import { LoggerService } from "@services/LoggerService";
import { CreateRefreshTokenData, TokenService } from "@services/TokenService";
import { OAuth2Service } from "@services/OAuth2Service";

import { HTTPCodes } from "@utils";
import { Config } from "@config";
import { AclService } from "@services/AclService";

const oAuth2AuthorizationCodeFlow = (
  logger: LoggerService,
  client: ClientService,
  token: TokenService,
  account: AccountsService
) => {
  return async (request: Req, response: Res) => {

    let res: any = {};

    const clientFromReq = request.oauthClient;
    const { ip, country, city, eu } = request.ipInfo;
    const {
      grant_type,
      redirect_uri,
      client_secret,
      code_verifier,
      code,
      scope,
    } = request.body;

    let clientSecret;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.split(" ")[0] === "Basic") {
      const base64 = authHeader.split(" ")[1];
      let buff = new Buffer(base64, "base64");
      let clientCredentials = buff.toString("ascii");
      clientSecret = clientCredentials.split(":")[1];
    } else {
      clientSecret = client_secret;
    }

    logger.info(code_verifier ? "Initialized Authorization Code flow with PKCE." : "Initialized Authorization Code flow.", null, false);

    const validRedirectURI = await client.checkClientRedirectUri(clientFromReq, redirect_uri);

    if (!validRedirectURI) {
      logger.error("Client invalid redirect_uri: " + redirect_uri, null, false);

      return response.status(HTTPCodes.BadRequest).json({
        error: "invalid_client",
        error_description: "Invalid redirect_uri",
      });
    }

    const validClientSecret = await client.checkClientSecret(clientFromReq, clientSecret);
    if (!code_verifier && !validClientSecret) {
      return response.status(HTTPCodes.BadRequest).json({
        error: "invalid_client",
        error_description: "Invalid client credentials",
      });
    }

    if (!code) {
      return response.status(HTTPCodes.BadRequest).json({
        error: "invalid_request",
        error_description: "Invalid request",
      });
    }

    try {
      logger.info("Authorization code validation in progress.", null, false);
      const decoded: any = await token.verifyCodeToken(code);

      if (!decoded) {
        logger.error("Authorization code expired.", null, true);
        return response.status(HTTPCodes.BadRequest).json({
          error: "invalid_request",
          error_description: "Invalid request",
        });
      }

      if (decoded.code_challenge) {
        logger.info("Verify a code challenge in progress.");
        const verified = verifyChallenge(code_verifier, decoded.code_challenge);
        if (!verified) {
          logger.error("Code challenge verify failed.", null, true);
          return response.status(HTTPCodes.BadRequest).json({
            error: "invalid_client",
            error_description: "Invalid client credentials",
          });
        }
        logger.success("Code challenge verified.", null, true);
      }

      logger.success("Authorization code is fine.", null, true);
      const findAccount = await account.getByUUIDWithRelations(decoded.sub, ["emails",]);
      let scopes: string[] = decoded.scopes;

      const state = decoded.state;

      logger.info("Generates an Access Token for " + findAccount.username + " (" + findAccount.uuid + ")", null, true);

      const access_token = await token.createAccessToken({
        sub: findAccount.uuid,
        client_id: clientFromReq.client_id,
        scopes: scopes
      });
      res.access_token = access_token;
      res.token_type = "Bearer";
      res.expires_in = Number(Config.Token.AccessTokenExp),
      res.scope = scopes.join(" ");

      logger.success("Access Token generated: " + access_token);

      logger.info("Generates an ID Token for " + findAccount.username + " (" + findAccount.uuid +")", null, true);

      const at_hash = token.createAtHash(access_token, "RS256");
      const c_hash = token.createCHash(code, "RS256");
      const s_hash = token.createSHash("12345", "RS256");

      if(scopes.includes("openid")) {
        const id_token = await token.createIDToken({
          sub: findAccount.uuid,
          username: findAccount.username,
          picture: findAccount.avatar,
          email: findAccount.getPrimaryEmail(),
          role: findAccount.role,
          banned: findAccount.banned,
          client_id: clientFromReq.client_id,
          country: country,
          scopes: scopes,
          amr: ["pw"],
          acr: "urn:raining:bronze",
          azp: ["raining_auth"],
          at_hash: at_hash,
          c_hash: c_hash,
          s_hash: s_hash,
          nonce: decoded.nonce,
        });
        res.id_token = id_token;
  
        logger.success("ID Token generated: " + id_token);
      }



      if(scopes.includes("offline_access")) {
        const RefreshTokenData: CreateRefreshTokenData = {
          sub: findAccount.uuid,
          client_id: clientFromReq.client_id,
          scopes: scopes,
        };


        const refresh_token = await token.createRefreshToken(RefreshTokenData);
        res.refresh_token = refresh_token;
        res.refresh_token_type = "Bearer";
      }

      return response.status(HTTPCodes.OK).json(res);
    } catch (err) {
      logger.error(err, null, false);
      return response.status(HTTPCodes.BadRequest).json({
        error: "access_denied",
        error_description: "Invalid request",
      });
    }
  };
};

export { oAuth2AuthorizationCodeFlow };
