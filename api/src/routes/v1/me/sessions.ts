import { Controller } from "@tsed/di";
import { Delete, Get } from "@tsed/schema";
import { Context, Req, Res, UseBefore } from "@tsed/common";

import { SessionService } from "@services/SessionService";
import { SessionMiddleware } from "@middlewares/session.middleware";
import { AccountsService } from "@services/AccountsService";

@Controller("/me/sessions")
export class MeSessionsRoute {
  constructor(private accountsService: AccountsService) {}

  @Get("/")
  @UseBefore(SessionMiddleware)
  public async getSessionsMe(
    @Req() request: Req,
    @Res() response: Res,
    @Context("session") session: SessionService
  ) {
    const sessions = await this.accountsService.getMeSessionsEndpoint(session.getCurrentSessionAccount.uuid);
    response.status(200).json(
      sessions.map((s) => {
        return {
          ...s,
          current: s.uuid === session.getCurrentSessionUuid,
        };
      })
    );
  }

  @Delete("/:uuid")
  @UseBefore(SessionMiddleware)
  public async deleteSessionsMe(
    @Req() request: Req,
    @Res() response: Res,
    @Context("session") session: SessionService
  ) {
    console.log(session.getCurrentSessionAccount);
    
    const uuid = request.params.uuid;
    const { affected } = await this.accountsService.deleteAccountSession(uuid, session.getCurrentSessionAccount.uuid);
    response.status(200).json({
      success: !!affected
    });
  }
}
