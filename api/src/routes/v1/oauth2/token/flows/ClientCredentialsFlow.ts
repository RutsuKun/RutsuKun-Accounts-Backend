import { Req, Res } from "@tsed/common";

import { ClientService } from "@services/ClientService";
import { LoggerService } from "@services/LoggerService";
import { TokenService } from "@services/TokenService";

import { HTTPCodes } from "@utils";
import { Config } from "@config";

const oAuth2ClientCredentials = (
  logger: LoggerService,
  client: ClientService,
  token: TokenService
) => {
  return async (req: Req, res: Res) => {
    const clientFromReq = req.oauthClient;
    let clientSecret = null;

    const { client_secret, scope } = req.body;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.split(" ")[0] === "Basic") {
      const base64 = authHeader.split(" ")[1];
      let buff = new Buffer(base64, "base64");
      let clientCredentials = buff.toString("ascii");
      clientSecret = clientCredentials.split(":")[1];
    } else {
      clientSecret = client_secret;
    }

    logger.info("Initialized Client Credentials flow.", null, true);

    if (!(await client.checkClientSecret(clientFromReq, clientSecret))) {
      res.status(HTTPCodes.BadRequest).json({ error: "invalid_client", error_description: "Client secret invalid" });
    }

    logger.info("Client Secret is fine");

    logger.info("Generates an Access Token for " + clientFromReq.name + " (" + clientFromReq.client_id +")", null, true);

    const access_token = await token.createAccessToken({
      sub: clientFromReq.client_id,
      client_id: clientFromReq.client_id,
      scopes: scope,
    });

    logger.success("Access Token generated: " + access_token);

    res.status(HTTPCodes.OK).json({
      access_token: access_token,
      type: "Bearer",
      expires_in: Number(Config.Token.AccessTokenExp),
      scope: scope,
    });
  };
};

export { oAuth2ClientCredentials };
