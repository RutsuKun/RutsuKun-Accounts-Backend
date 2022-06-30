import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";
import { Config } from "@config";
import { Req, Res, Session } from "@tsed/common";

@Controller("/v1")
export class V1IndexRoute {
  constructor() {}

  @Get()
  public getIndex(@Req() request: Req, @Res() response: Res, @Session() session) {    
    return response.status(200).json({
      service: Config.appInfo.name,
      version: "v1",
      environment: Config.Environment.NODE_ENV,
    });
  }
}
