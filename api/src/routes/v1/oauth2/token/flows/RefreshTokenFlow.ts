import { Req, Res } from "@tsed/common";

import { ClientService } from "@services/ClientService";
import { LoggerService } from "@services/LoggerService";
import { CreateRefreshTokenData, TokenService } from "@services/TokenService";

import { HTTPCodes } from "@utils";
import { Config } from "@config";
import { AccountsService } from "@services/AccountsService";

const oAuth2RefreshToken = (
  logger: LoggerService,
  account: AccountsService,
  client: ClientService,
  token: TokenService
) => {
  return async (request: Req, response: Res) => {
    const res: any = {};
    const clientFromReq = request.oauthClient;
    let clientSecret = null;

    const { client_secret, refresh_token } = request.body;
    

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.split(" ")[0] === "Basic") {
      const base64 = authHeader.split(" ")[1];
      let buff = new Buffer(base64, "base64");
      let clientCredentials = buff.toString("ascii");
      clientSecret = clientCredentials.split(":")[1];
    } else {
      clientSecret = client_secret;
    }

    logger.info("Initialized Refresh Token flow.", null, true);

    if (clientSecret && !(await client.checkClientSecret(clientFromReq, clientSecret))) {
      response.status(HTTPCodes.BadRequest).json({
        error: "invalid_client",
        error_description: "Client secret invalid",
      });
    }

    logger.info("Client Secret is fine");

    const { valid, data } = token.verifyRefreshToken(refresh_token);

    if(!valid) {
        return response.status(HTTPCodes.BadRequest).json({
            error: "invalid_request",
            error_description: "Refresh token invalid or expired.",
          });
    }

    const findAccount = await account.getByUUIDWithRelations(data.sub, ["emails",]);


    logger.info("Generates an Access Token for " + findAccount.username + " (" + findAccount.uuid + ")", null, true);
    const access_token = await token.createAccessToken({
      sub: findAccount.uuid,
      client_id: data.aud,
      scopes: data.scopes
    });

    res.access_token = access_token;
    res.type = "Bearer";
    res.expires_in = Number(Config.Token.AccessTokenExp);
    res.scope = data.scopes.join(" ");

    logger.success("Access Token generated: " + access_token);

    if(data.scopes.includes("openid")) {

      const at_hash = token.createAtHash(access_token, "RS256");

      const id_token = await token.createIDToken({
        sub: findAccount.uuid,
        username: findAccount.username,
        picture: findAccount.avatar,
        email: findAccount.getPrimaryEmail(),
        role: findAccount.role,
        banned: findAccount.banned,
        client_id: clientFromReq.client_id,
        scopes: data.scopes,
        amr: ["pw"],
        acr: "urn:raining:bronze",
        azp: ["raining_auth"],
        at_hash: at_hash,
        nonce: data.nonce,
      });
      res.id_token = id_token;

      logger.success("ID Token generated: " + id_token);
    }

    if(data.scopes.includes("offline_access")) {
      const RefreshTokenData: CreateRefreshTokenData = {
        sub: data.sub,
        client_id: clientFromReq.client_id,
        scopes: data.scopes,
      };


      const refresh_token = await token.createRefreshToken(RefreshTokenData);
      res.refresh_token = refresh_token;
      res.refresh_token_type = "Bearer";
      res.refresh_token_expires_in = 0;
    }
  

    response.status(HTTPCodes.OK).json(res);
  };
};

export { oAuth2RefreshToken };
