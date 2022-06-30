import { Response } from "express";
import { ContextLogger, Controller } from "@tsed/di";
import { Get } from "@tsed/schema";
import { AccountsService } from "@services/AccountsService";
import { Context, Logger, PathParams, Req, Request, Res, UseBefore } from "@tsed/common";
import { AccessTokenMiddleware } from "@middlewares/security";
import { ScopeMiddleware } from "@middlewares/scope.middleware";
import { HTTP, HTTPCodes } from "@utils";
import { LoggerService } from "@services/LoggerService";
import { GroupService } from "@services/GroupService";
import { OrganizationService } from "@services/OrganizationService";

import _ from "lodash";
import { CheckTokenRevokedMiddleware } from "@middlewares/token.middleware";

@Controller("/admin/accounts")
export class AdminAccountsRoute {

  constructor(
    private accountsService: AccountsService,
    private organizationService: OrganizationService
  ) { }

  @Get("/")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:accounts:manage"]))
  public async getAccounts(
    @Res() res: Response
  ) {
    const accounts = await this.accountsService.listAccountsEndpoint();
    return res.status(200).json(accounts);
  }


  @Get("/:uuid")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:accounts:manage"]))
  public async getAccountByUuid(
    @Req() request: Request,
    @Res() response: Response,
    @Context("logger") logger: Logger
  ) {
    const uuid = request.params.uuid;
    try {
      const account = await this.accountsService.getAccountEndpoint(uuid);
      return response.status(200).json(account);
    } catch (error) {
      return HTTP.BadRequest(error, request, response, logger);
    }
    
  }

  @Get("/:uuid/groups")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:accounts:manage"]))
  public async getAccountGroupsByUuid(
    @Req() request: Request,
    @Res() response: Response,
    @PathParams("uuid") uuid: string,
    @Context("logger") logger: Logger
  ) {
    let { groups } = await this.accountsService.getAccountGroupsByUUID(uuid);

    if (!groups) return HTTP.ResourceNotFound(uuid, request, response, logger);

    return response.status(200).json(groups);
  }


  @Get("/:uuid/permissions")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:accounts:manage"]))
  public async getAccountPermissionsByUuid(
    @Req() request: Request,
    @Res() response: Response,
    @PathParams("uuid") uuid: string,
    @Context("logger") logger: Logger
  ) {

    let allPermissions = await this.accountsService.getAllPermissionsByUUID(uuid);

    if (!allPermissions) return HTTP.ResourceNotFound(uuid, request, response, logger);
    
    return response.status(200).json(allPermissions);
  }


}
