import { NextFunction, Request, Response } from "express";
import { Controller, Inject } from "@tsed/di";
import { Delete, Get, Post } from "@tsed/schema";
import { Context, HttpServer, Logger, PathParams, Req, Res, UseBefore } from "@tsed/common";
import { AccessTokenMiddleware } from "@middlewares/security";
import { ScopeMiddleware } from "@middlewares/scope.middleware";
import { GroupService } from "@services/GroupService";
import { AccountGroup } from "@entities/AccountGroup";
import { HTTP, HTTPCodes, Validate } from "@utils";
import { OrganizationService } from "@services/OrganizationService";
import { Organization } from "@entities/Organization";

@Controller("/admin/organizations")
export class AdminOrganizationsRoute {
  constructor(@Inject() private organizationService: OrganizationService) {}

  @Get()
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:organizations:read", "admin:organizations:manage", "admin:access"], {
      checkAllScopes: false,
    })
  )
  public async getIndex(req: Request, res: Response, next: NextFunction) {
    let orgs = await this.organizationService.getOrganizations();
    return res.status(200).json(orgs);
  }

  @Post()
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:scopes:manage"]))
  public async postAdminOrganization(
    @Req() request: Req,
    @Res() response: Res
  ) {
    const data: Organization = request.body;
    const organization = await this.organizationService.createOrganization(data);
    response.status(HTTPCodes.Created).json(organization);
  }

  @Get("/:uuid")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:organizations:read", "admin:organizations:manage", "admin:access"], {
      checkAllScopes: false,
    })
  )
  public async getOrganization(
    @Req() request: Req,
    @Res() response: Res,
    @PathParams("uuid") uuid: string
  ) {
    let org = await this.organizationService.getOrganizationByUUID(uuid);
    return response.status(200).json(org);
  }

  @Delete("/:uuid")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:access", "admin:organizations:manage", "admin:organizations:delete"], {
      checkAllScopes: false,
    })
  )
  public async deleteAdminOrganization(
    @PathParams("uuid") uuid: string,
    @Res() response: Res
  ) {
    const deleted = await this.organizationService.deleteOrganization(uuid);
    if (deleted.affected) {
      response.status(HTTPCodes.OK).send();
    } else {
      response.status(HTTPCodes.NotFound).send();
    }
  }

  @Get("/:uuid/debug")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:organizations:read", "admin:organizations:manage", "admin:access"], {
      checkAllScopes: false,
    })
  )
  public async getOrganizationDebug(
    @Req() request: Req,
    @Res() response: Res,
    @PathParams("uuid") uuid: string
  ) {
    let details = await this.organizationService.getOrganizationDetailsByUUID(uuid);
    return response.status(200).json({
      id: details.id,
      uuid: details.uuid,
      logo: details.logo,
      name: details.name,
      description: details.description,
      domain: details.domain,
      apps: details.clients.map((app) => ({ uuid: app.uuid, client_id: app.client_id, name: app.name })),
      members: details.members.map((member) => ({
        member_id: member.id,
        member_uuid: member.uuid,
        id: member.account.id,
        uuid: member.account.uuid,
        picture: member.account.avatar,
        username: member.account.username,
        permissions: member.scopes.map((scope) => scope.name)
      })),
      groups: details.groups.map((group) => ({
        id: group.assignedGroup.id,
        uuid: group.assignedGroup.uuid,
        name: group.assignedGroup.name,
        display_name: group.assignedGroup.display_name,
        permissions: group.scopes.map((scope) => scope.name)
      }))
    });
  }

  @Get("/:uuid/apps")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:organizations:read", "admin:organizations:manage", "admin:access"], {
      checkAllScopes: false,
    })
  )
  public async getOrganizationApps(
    @Req() request: Req,
    @Res() response: Res,
    @PathParams("uuid") uuid: string
  ) {
    let { clients } = await this.organizationService.getOrganizationAppsByUUID(uuid);
    return response.status(200).json(clients.map((client) => {
      return {
        uuid: client.uuid,
        name: client.name,
        client_id: client.client_id,
        logo: client.logo,
        account: {
          picture: client.account.avatar,
          username: client.account.username
        }
      }
    }));
  }

  @Get("/:uuid/members")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:organizations:read", "admin:organizations:manage", "admin:access"], {
      checkAllScopes: false,
    })
  )
  public async getOrganizationMembers(
    @Req() request: Req,
    @Res() response: Res,
    @PathParams("uuid") uuid: string
  ) {
    let { members } = await this.organizationService.getOrganizationMembersByUUID(uuid);
    return response.status(200).json(members);
  }

  @Get("/:uuid/groups")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:organizations:read", "admin:organizations:manage", "admin:access"], {
      checkAllScopes: false,
    })
  )
  public async getOrganizationGroups(
    @Req() request: Req,
    @Res() response: Res,
    @PathParams("uuid") uuid: string
  ) {
    let { groups } = await this.organizationService.getOrganizationGroupsByUUID(uuid);

    return response.status(200).json(groups.map((group) => {
      return {
        uuid: group.assignedGroup.uuid,
        name: group.assignedGroup.name,
        display_name: group.assignedGroup.display_name,
        enabled: group.assignedGroup.enabled
      }
    }));
  }
}
