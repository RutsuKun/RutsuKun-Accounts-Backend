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

}
