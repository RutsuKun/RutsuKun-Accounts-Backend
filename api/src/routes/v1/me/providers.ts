import { Controller } from "@tsed/di";
import { Delete, Get } from "@tsed/schema";
import { Context, Req, Res, UseBefore } from "@tsed/common";

import { SessionService } from "@services/SessionService";
import { SessionMiddleware } from "@middlewares/session.middleware";
import { AccountsService } from "@services/AccountsService";
import { AuthService } from "@services/AuthService";
import { Config } from "@config";
import { IProvider, ProviderIdentity } from "@providers/IProvider";

@Controller("/me/providers")
export class MeProvidersRoute {
  constructor(
    private authService: AuthService,
    private accountsService: AccountsService
  ) {}

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

  @Get("/:providerId/connect")
  @UseBefore(SessionMiddleware)
  public async getProviderConnect(
    @Req() request: Req,
    @Res() response: Res,
    @Context("session") session: SessionService
  ) {
    const providerId = request.params.providerId || "unknown";

    const provider = this.authService
      .getProviders()
      .find((p) => p.id === providerId);

    if (!provider) {
      return response.json({
        error: "invalid_request",
        error_description: `Requested provider '${providerId}' does not exist`,
      });
    }

    const callbackUrl = provider.getConnectCallbackUrl(request.id, [
      "openid",
      "profile",
      "email",
    ]);

    if (callbackUrl) {
      session.setAction({
        type: "connect-provider",
        connectProvider: {
          providerId: providerId,
          requestId: request.id,
        },
      });
      await session.saveSession();
    }

    return response.redirect(callbackUrl);
  }

  @Get("/:providerId/connect-callback")
  @UseBefore(SessionMiddleware)
  public async getProviderConnectCallback(
    @Req() request: Req,
    @Res() response: Res,
    @Context("session") session: SessionService
  ) {
    const providerId: string = request.params.providerId || "unknown";
    const provider: IProvider = this.authService
      .getProviders()
      .find((p) => p.id === providerId);
    const state: string = (request.query.state as string) || null;
    const connectProviderAction = session.getAction;

    if (!provider) {
      return response.redirect(`${Config.FRONTEND.url}/connect-provider?${new URLSearchParams({
        error: "invalid_request",
        error_description: `Requested provider '${providerId}' does not exist`,
      })}`);
    }

    if (
      !connectProviderAction ||
      connectProviderAction.type !== "connect-provider" ||
      connectProviderAction.connectProvider.requestId !== state
    ) {
      session.delAction();
      await session.saveSession();
      return response.redirect(`${Config.FRONTEND.url}/connect-provider?${new URLSearchParams({
        error: "invalid_request",
        error_description: "Requested action is invalid",
      })}`);
    }

    if (connectProviderAction.connectProvider.providerId !== providerId) {
      session.delAction();
      await session.saveSession();
      return response.redirect(`${Config.FRONTEND.url}/connect-provider?${new URLSearchParams({
        error: "invalid_request",
        error_description: "Requested provider is invalid",
      })}`);
    }

    const originalUrl = request.originalUrl;
    let providerIdentity: ProviderIdentity;

    providerIdentity = (await provider.handleConnectCallback(
      connectProviderAction.connectProvider.requestId,
      ["openid", "profile", "email"],
      originalUrl
    )) as ProviderIdentity;

    if (providerIdentity["error"]) {
      response.status(500);
      session.delAction();
      await session.saveSession();

      return response.redirect(`${Config.FRONTEND.url}/connect-provider?${new URLSearchParams({
        error: providerIdentity["error"],
        error_description: "",
      })}`);
    }

    const findedAccountByProvider =
      await this.accountsService.getAccountByProvider(
        providerId,
        providerIdentity.id
      );

    const loggedAccount = await this.accountsService.getByUUIDWithRelations(
      session.getCurrentSessionAccount.logged
        ? session.getCurrentSessionAccount.uuid
        : null,
      ["providers"]
    );

    // FINDED ANY ACCOUNT
    if (findedAccountByProvider) {
      // FINDED ACCOUNT BY PROVIDER
      return response.redirect(`${Config.FRONTEND.url}/connect-provider?${new URLSearchParams({
        error: 'invalid_request',
        error_description: 'Provider already connected'
      })}`);
    } else {
      // IF LOGGED USER ATTACH PROVIDER TO ACCOUNT
      if (session.getCurrentSessionAccount.logged) {
        this.accountsService.addProvider({
          provider: providerId,
          id: providerIdentity.id,
          name: providerIdentity.name,
          email: providerIdentity.email || "todo@todo",
          picture: providerIdentity.picture,
          account: loggedAccount,
        });

        return response.redirect(`${Config.FRONTEND.url}/connect-provider?${new URLSearchParams({ success: "true" })}`);
      }

    }
  }

}
