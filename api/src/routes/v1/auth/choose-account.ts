import { Controller, Inject } from "@tsed/di";
import { Post } from "@tsed/schema";
import { AccountsService } from "@services/AccountsService";
import { AuthService } from "@services/AuthService";
import { SessionService } from "@services/SessionService";
import { OAuth2Service } from "@services/OAuth2Service";
import { ClientService } from "@services/ClientService";
import { Context, Req, Res, UseBefore } from "@tsed/common";
import { LoggerService } from "@services/LoggerService";
import { HTTPCodes } from "@utils";
import {
  SessionMiddleware,
} from "@middlewares/session.middleware";

@Controller("/auth/choose-account")
export class AuthChooseAccountRoute {
  constructor(
    @Inject() private authService: AuthService,
    @Inject() private oauthService: OAuth2Service  ) {}

  @Post()
  @UseBefore(SessionMiddleware)
  public async postChooseAccount(
    @Req() request: Req,
    @Res() response: Res,
    @Context("session") session: SessionService
  ) {
    const { account_uuid } = request.body;

    try {
      const data = await this.authService.chooseAccount(
        { account_uuid },
        session
      );

      switch (data.type) {
        case "logged-in":
          if (session.getFlow === "auth") {
            const multifactorRequired =
              await this.authService.checkMfaAuthnRequired(
                session.getCurrentSessionAccount.uuid,
                session,
                "urn:rutsukun:gold"
              );

            if (
              multifactorRequired &&
              multifactorRequired.type === "multifactor"
            ) {
              return response.status(200).json(multifactorRequired);
            }

            return response.status(200).json({
              type: "logged-in",
            });
          } else if (session.getFlow === "oauth") {
            const data = await this.oauthService.checkConsent(
              request,
              response,
              session
            );
            return response.status(200).json(data);
          }
          break;
        case "multifactor":
          response.status(HTTPCodes.OK).json({
            type: data.type,
            multifactor: data.multifactor,
          });
          break;
        default:
          response.status(HTTPCodes.InternalServerError).json({
            type: "error",
            error: "invalid_response_type",
          });
          break;
      }
    } catch (error) {
      console.error(error);
      response.status(HTTPCodes.BadRequest).json({
        type: "error",
        error: error.message,
        requestId: request.id,
      });
    }
  }
}
