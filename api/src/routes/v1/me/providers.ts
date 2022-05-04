import { Controller } from "@tsed/di";
import { Delete, Get } from "@tsed/schema";
import { Context, Req, Res, UseBefore } from "@tsed/common";

import { SessionService } from "@services/SessionService";
import { SessionMiddleware } from "@middlewares/session.middleware";
import { AccountsService } from "@services/AccountsService";

@Controller("/me/providers")
export class MeProvidersRoute {
  constructor(private accountsService: AccountsService) {}

  @Get("/")
  @UseBefore(SessionMiddleware)
  public async getMeProviders(
    @Res() response: Res,
    @Context("session") session: SessionService
  ) {
    const currentAccount = await this.accountsService.getByUUIDWithRelations(
        session.getCurrentSessionAccount.uuid,
        ["providers"]
    );
    response.status(200).json(currentAccount.providers);
  }
}
