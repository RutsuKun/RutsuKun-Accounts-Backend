import { NextFunction, Request, Response } from "express";
import { Controller, Inject } from "@tsed/di";
import { Delete, Get, Post } from "@tsed/schema";
import { Context, HttpServer, Logger, PathParams, Req, Res, UseBefore } from "@tsed/common";
import { AccessTokenMiddleware } from "@middlewares/security";
import { ScopeMiddleware } from "@middlewares/scope.middleware";
import { GroupService } from "@services/GroupService";
import { AccountGroup } from "@entities/AccountGroup";
import { HTTP, HTTPCodes, Validate } from "@utils";

@Controller("/admin/groups")
export class AdminGroupsRoute {
  constructor(@Inject() private groupService: GroupService) {}

  @Get()
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:groups:read", "admin:groups:manage", "admin:access"], {
      checkAllScopes: false,
    })
  )
  public async getIndex(req: Request, res: Response, next: NextFunction) {
    let groups = await this.groupService.getGroups();

    return res.status(200).json([
      ...groups.map((group) => {
        return {
          uuid: group.uuid,
          name: group.name,
          display_name: group.display_name,
          enabled: group.enabled,
        };
      }),
    ]);
  }

  @Post("/")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:groups:manage"]))
  public async createGroup(
    @Req() request: Req,
    @Res() response: Res,
    @Context("logger") logger: Logger
  ) {
    console.log(request.body);
    
    const { name, display_name, enabled } = request.body;

    if (Validate.isUndefined(name) || Validate.isEmpty(name)) {
      return HTTP.BadRequest({
        error: "Name is required"
      }, request, response, logger);
    }

    if (Validate.isUndefined(display_name) || Validate.isEmpty(display_name)) {
      return HTTP.BadRequest({
        error: "Display name is required"
      }, request, response, logger);
    }

    if (Validate.isUndefined(enabled)) {
      return HTTP.BadRequest({
        error: "Enabled is required"
      }, request, response, logger);
    }

    if (!Validate.isBoolean(enabled)) {
      return HTTP.BadRequest({
        error: "Enabled must be boolean type"
      }, request, response, logger);
    }

    try {
      const scope = await this.groupService.createGroup({ name, display_name, enabled });
      response.status(HTTPCodes.Created).json(scope);
    } catch (err) {
      return HTTP.BadRequest({
        error: "Group already exists with that name or display name"
      }, request, response, logger);
    }
  }

  @Get("/:uuid")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:access", "admin:groups:manage", "admin:groups:read"], {
      checkAllScopes: false,
    })
  )
  public async getGroupByUuid(
    @Req() request: Request,
    @Res() response: Response,
    @PathParams("uuid") uuid: string,
    @Context("logger") logger: Logger
  ) {
    let group = await this.groupService.getGroupByUUID(uuid);
    console.log(group);
    if (!group) return HTTP.ResourceNotFound(uuid, request, response, logger);

    return response.status(200).json(group);
  }

  @Get("/:uuid/permissions")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:access", "admin:groups:manage", "admin:groups:read"], {
      checkAllScopes: false,
    })
  )
  public async getGroupPermissionsByUuid(
    @Req() request: Request,
    @Res() response: Response,
    @PathParams("uuid") uuid: string,
    @Context("logger") logger: Logger
  ) {
    let group = await this.groupService.getGroupPermissionsByUUID(uuid);

    if (!group) return HTTP.ResourceNotFound(uuid, request, response, logger);



    const permissions = group.groupScopes.map((groupScope) => {
      if(!groupScope.scope) return;
      return {
        uuid: groupScope.scope.uuid,
        default: groupScope.scope.default,
        system: groupScope.scope.system,
        name: groupScope.scope.name,
      };
    });

    return response.status(200).json(permissions);
  }

  @Get("/:uuid/members")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:access", "admin:groups:manage", "admin:groups:read"], {
      checkAllScopes: false,
    })
  )
  public async getGroupMembersByUuid(
    @Req() request: Request,
    @Res() response: Response,
    @PathParams("uuid") uuid: string,
    @Context("logger") logger: Logger
  ) {
    let group = await this.groupService.getGroupMembersByUUID(uuid);



    if (!group) return HTTP.ResourceNotFound(uuid, request, response, logger);

    const members = group.accounts.map((groupAccount) => {
      return {
        uuid: groupAccount.uuid,
        username: groupAccount.username,
        picture: groupAccount.avatar,
        email: groupAccount.getPrimaryEmail()
      };
    });

    return response.status(200).json(members);
  }

  @Delete("/:uuid")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:access", "admin:groups:manage", "admin:groups:delete"], {
      checkAllScopes: false,
    })
  )
  public async deleteGroup(
    @PathParams("uuid") uuid: string,
    @Res() response: Res
  ) {
    const deleted = await this.groupService.deleteGroup(uuid);
    if (deleted.affected) {
      response.status(HTTPCodes.OK).send();
    } else {
      response.status(HTTPCodes.NotFound).send();
    }
  }
}
