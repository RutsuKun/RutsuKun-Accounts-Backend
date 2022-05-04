import { Response } from "express";
import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";
import { Res, UseBefore } from "@tsed/common";
import { AccessTokenMiddleware } from "@middlewares/security";
import { ScopeMiddleware } from "@middlewares/scope.middleware";
import { LoggerService } from "@services/LoggerService";
import { OAuth2Service } from "@services/OAuth2Service";

@Controller("/admin/authorizations")
export class AdminAuthorizationsRoute {
  constructor(
    private oauthService: OAuth2Service,
    private loggerservice: LoggerService
  ) {}

  @Get("/")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access"]))
  public async getAuthorizations(@Res() res: Response) {
    const authoriozations = await this.oauthService.getAuthorizations();
    return res.status(200).json([
      ...authoriozations.map((authz) => {
        return {
          id: authz.id,
          uuid: authz.uuid,
          account: {
            id: authz.account.id,
            uuid: authz.account.uuid,
            username: authz.account.username,
            picture: authz.account.avatar,
          },
          client: {
            uuid: authz.client.uuid,
            client_id: authz.client.client_id,
            picture: authz.client.logo,
          },
          scopes: authz.scopes.map((scope) => scope.name),
        };
      }),
    ]);
  }
}
