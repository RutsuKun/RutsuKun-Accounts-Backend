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

  @Get("/:uuid/debug")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:organizations:read", "admin:organizations:manage", "admin:access"], {
      checkAllScopes: false,
    })
  )
  public async getOrganizationDetails(
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
        id: group.group.id,
        uuid: group.group.uuid,
        name: group.group.name,
        display_name: group.group.display_name,
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

    console.log('aaaaaaaa ', members);
    

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
        uuid: group.group.uuid,
        name: group.group.name,
        display_name: group.group.display_name,
        enabled: group.group.enabled
      }
    }));
  }
}
