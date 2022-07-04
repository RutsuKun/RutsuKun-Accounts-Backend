import { Controller } from "@tsed/di";
import { Delete, Get, Post } from "@tsed/schema";
import { AccountsService } from "@services/AccountsService";
import { Context, Req, Res, UseBefore } from "@tsed/common";
import {
  SessionLoggedMiddleware,
  SessionMiddleware,
} from "@middlewares/session.middleware";
import { SessionService } from "@services/SessionService";
import { HTTPCodes, Validate } from "@utils";

@Controller("/me")
export class MeRoute {
  constructor(private accountsService: AccountsService) {}

  @Get("/")
  @UseBefore(SessionLoggedMiddleware)
  @UseBefore(SessionMiddleware)
  public async getMe(
    @Res() response: Res,
    @Context("session") session: SessionService
  ) {
    const currentAccount = await this.accountsService.getByUUIDWithRelations(
      session.getCurrentSessionAccount.uuid,
      ["emails", "providers", "groups", "authn_methods", "organizations", "organizations.organization"]
    );
    delete currentAccount.password;
    delete currentAccount.verifyPassword;

    const res = {
      ...currentAccount,
      organizations: currentAccount.organizations.map((org) => ({
        id: org.organization.id,
        uuid: org.organization.uuid,
        name: org.organization.name
      })),
      authn_methods: currentAccount.authn_methods.map((method) => {
        return {
          type: method.type,
          enabled: method.enabled,
        };
      }),
    };

    response.status(200).json(res);

  }

  @Post("/emails")
  @UseBefore(SessionMiddleware)
  public async postMeEmails(
    @Req() request: Req,
    @Res() response: Res,
    @Context("session") session: SessionService
  ) {
    const currentAccount = await this.accountsService.getAccountByUUID(
      session.getCurrentSessionAccount.uuid
    );

    const email: string = request.body.email;

    if (Validate.isNull(email) || Validate.isEmpty(email)) {
      return response.status(HTTPCodes.NotAcceptable).json({
        error: "Email cannot be empty",
      });
    }

    if (!Validate.isEmail(email)) {
      return response.status(HTTPCodes.NotAcceptable).json({
        error: "Email is invalid",
      });
    }

    const addedEmail = await this.accountsService.addEmail({
      email: email,
      email_verified: false,
      primary: false,
      account: currentAccount,
    });

    delete addedEmail.account;

    response.status(HTTPCodes.Created).json(addedEmail);
  }

  @Delete("/emails/:uuid")
  @UseBefore(SessionMiddleware)
  public async deleteMeEmails(
    @Req() request: Req,
    @Res() response: Res,
    @Context("session") session: SessionService
  ) {
    const currentAccount = await this.accountsService.getAccountByUUID(
      session.getCurrentSessionAccount.uuid
    );

    const emailUuid: string = request.params.uuid;

    const deletedEmail = await this.accountsService.deleteEmail(
      emailUuid,
      currentAccount.uuid
    );

    if (deletedEmail.affected) {
      response.status(HTTPCodes.OK).json();
    } else {
      response.status(HTTPCodes.BadRequest).json({
        error: "Something went wrong",
      });
    }
  }
}
