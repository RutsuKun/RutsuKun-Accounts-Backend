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

@Controller("/admin/accounts")
export class AdminAccountsRoute {

  constructor(
    private accountsService: AccountsService,
    private organizationService: OrganizationService
  ) { }

  @Get("/")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:accounts:manage"]))
  public async getAccounts(
    @Res() res: Response
  ) {
    const accounts = await this.accountsService.listAccountsEndpoint();
    return res.status(200).json(accounts);
  }


  @Get("/:uuid")
  @UseBefore(AccessTokenMiddleware)
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
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:accounts:manage"]))
  public async getAccountPermissionsByUuid(
    @Req() request: Request,
    @Res() response: Response,
    @PathParams("uuid") uuid: string,
    @Context("logger") logger: Logger
  ) {

    let organizationPermissions = await this.organizationService.getOrganizationMemberScopesByUUID(uuid);

    let accountPermissions = await this.accountsService.getAccountPermissionsByUUID(uuid);

    if (!accountPermissions && !organizationPermissions) return HTTP.ResourceNotFound(uuid, request, response, logger);

    console.log('organizationPermissions ', organizationPermissions);
    

    organizationPermissions = organizationPermissions ? organizationPermissions.scopes.map((orgScope) => {
      return {
        uuid: orgScope.uuid,
        default: orgScope.default,
        system: orgScope.system,
        name: orgScope.name,
        org_uuid: organizationPermissions.organization.uuid
      };
    }) as any : [];

    accountPermissions = accountPermissions.accountScopes.map((accountScope) => {
      return {
        uuid: accountScope.scope.uuid,
        default: accountScope.scope.default,
        system: accountScope.scope.system,
        name: accountScope.scope.name,
        acl_uuid: accountScope.acl.uuid
      };
    }) as any;

    return response.status(200).json({
      accountPermissions,
      organizationPermissions
    });
  }


}
