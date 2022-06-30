import { Controller, Delete, Get, Inject, PathParams, Post, Put, Req, Res, UseBefore } from "@tsed/common";

// MIDDLEWARES

import { ScopeMiddleware } from "@middlewares/scope.middleware";
import { AccessTokenMiddleware } from "@middlewares/security";
import { CheckTokenRevokedMiddleware } from "@middlewares/token.middleware";

// SERVICES

import { ScopeService } from "@services/ScopeService";

import { HTTPCodes } from "@utils";
import { OAuthScope } from "@entities/OAuthScope";
import { MethodNotAllowed } from "@tsed/exceptions";

@Controller("/admin/scopes")
export class AdminScopesRoute {
  @Inject() private scopeService: ScopeService;
  constructor() {}

  @Get("/")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:scopes:manage"]))
  public async getAdminScopes(@Req() request: Req, @Res() response: Res) {
    const scopes = await this.scopeService.getScopes();
    response.status(HTTPCodes.OK).json(scopes);
  }

  @Post("/")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:scopes:manage"]))
  public async postAdminScopes(@Req() request: Req, @Res() response: Res) {
    const data: OAuthScope = request.body;
    const scope = await this.scopeService.createScope(data);
    response.status(HTTPCodes.Created).json(scope);
  }

  @Delete("/:scope")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:access", "admin:scopes:manage", "admin:scopes:delete"], {
      checkAllScopes: false,
    })
  )
  public async deleteAdminScopes(
    @PathParams("scope") scope: string,
    @Res() response: Res
  ) {
    const deleted = await this.scopeService.deleteScope(scope);
    if (deleted.affected) {
      response.status(HTTPCodes.OK).send();
    } else {
      response.status(HTTPCodes.NotFound).send();
    }
  }

  @Put("/:scope")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:access", "admin:scopes:manage", "admin:scopes:update"], {
      checkAllScopes: false,
    })
  )
  public putAdminScopes() {
    throw new MethodNotAllowed("MethodNotAllowed");
  }
}
