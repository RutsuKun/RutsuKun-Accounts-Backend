import {
  Middleware,
  Next,
  Req,
  Res,
  Inject,
  InjectorService,
} from "@tsed/common";
import { ClientService } from "@services/ClientService";
import { HTTPCodes } from "@utils";

@Middleware()
export class CheckClientMiddleware {
  private clientService: ClientService = null;

  @Inject()
  injector: InjectorService;

  constructor() {}

  $onInit() {
    this.clientService = this.injector.get<ClientService>(ClientService);
  }

  use(@Req() req: Req, @Res() res: Res, @Next() next: Next) {
    let clientId;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.split(" ")[0] === "Basic") {
      const base64 = authHeader.split(" ")[1];
      let buff = new Buffer(base64, "base64");
      let clientCredentials = buff.toString("ascii");
      clientId = clientCredentials.split(":")[0];
    }
    const client_id = clientId || req.body.client_id || undefined;

    if (!client_id)
      return res.status(400).json({
        error: "invalid_request",
        error_description: "Parameter client_id is required",
      });

    this.clientService
      .getClientByClientId(client_id)
      .then((client) => {
        // @ts-ignore
        req.oauthClient = client;
        next();
      })
      .catch((error) => {
        return res.status(400).json(error);
      });
  }
}
@Middleware()
export class CheckClientCredentialsMiddleware {
  private clientService: ClientService = null;

  @Inject()
  injector: InjectorService;

  constructor() {}

  $onInit() {
    this.clientService = this.injector.get<ClientService>(ClientService);
  }

  use(
    @Req() request: Req,
    @Res() response: Res,
    @Next() next: Next
  ) {
    let clientId;
    let clientSecret;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.split(" ")[0] === "Basic") {
      const base64 = authHeader.split(" ")[1];
      let buff = new Buffer(base64, "base64");
      let clientCredentials = buff.toString("ascii");
      clientId = clientCredentials.split(":")[0];
      clientSecret = clientCredentials.split(":")[1];
    }

    const client_id = clientId || request.body.client_id || undefined;
    const client_secret = clientSecret || request.body.client_secret || undefined;

    if (!client_id)
      return response.status(400).json({
        error: "invalid_request",
        error_description: "Parameter client_id is required",
      });

    this.clientService
      .getClientByClientId(client_id)
      .then(async (client) => {
        const validClientSecret = await this.clientService.checkClientSecret(client, client_secret);
        if(client.secret && !validClientSecret) {
          return response.status(HTTPCodes.BadRequest).json({
            error: "invalid_client",
            error_description: "Invalid client credentials",
          });
        }
        next();
      })
      .catch((error) => {
        return response.status(400).json(error);
      });
  }
}
