import { NextFunction, Request, Response } from "express";
import { Controller, Inject } from "@tsed/di";
import { Get } from "@tsed/schema";
import { UseBefore } from "@tsed/common";
import { AccessTokenMiddleware } from "@middlewares/security";
import { ScopeMiddleware } from "@middlewares/scope.middleware";
import { ResourceServerService } from "@services/ResourceServerService";

@Controller("/admin/resource-servers")
export class AdminResourceServersRoute {
  constructor(
      @Inject() private resourceServerService: ResourceServerService
  ) {}

  @Get()
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(
    new ScopeMiddleware().use(["admin:resource-servers:read", "admin:resource-servers:manage", "admin:access"], {
      checkAllScopes: false,
    })
  )
  public async getIndex(req: Request, res: Response, next: NextFunction) {
    let resourceServers = await this.resourceServerService.getResourceServers();

    return res.status(200).json(resourceServers);
  }

}
