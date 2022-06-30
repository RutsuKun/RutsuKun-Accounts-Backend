import { Controller, Inject, Post, Req, Res, UseBefore } from "@tsed/common";

// SERVICES

import { AccessTokenData, TokenService } from "@services/TokenService";
import { LoggerService } from "@services/LoggerService";
import { AccountsService } from "@services/AccountsService";
import { ClientService } from "@services/ClientService";
import { OAuth2Service } from "@services/OAuth2Service";
import { SessionService } from "@services/SessionService";

// MIDDLEWARES

import { CheckClientMiddleware } from "@middlewares/client.middleware";

// OAUTH2 FLOWS

import { oAuth2AuthorizationCodeFlow } from "./flows/AuthorizationCodeFlow";
import { oAuth2ClientCredentials } from "./flows/ClientCredentialsFlow";
import { oAuth2DeviceCode } from "./flows/DeviceCodeFlow";

import { HTTP, HTTPCodes } from "@utils";
import { AclService } from "@services/AclService";
import { oAuth2RefreshToken } from "./flows/RefreshTokenFlow";

@Controller("/oauth2/token")
export class OAuth2TokenRoute {
  public logger: LoggerService;
  constructor(
    @Inject() private sessionService: SessionService,
    @Inject() private accountService: AccountsService,
    @Inject() private oauthService: OAuth2Service,
    @Inject() private clientService: ClientService,
    @Inject() private loggerService: LoggerService,
    @Inject() private tokenService: TokenService
  ) {
    this.logger = this.loggerService.child({
      label: { name: "OAuth2", type: "oauth2" },
    });
  }

  @Post("/")
  @UseBefore(CheckClientMiddleware)
  public getToken(@Req() request: Req, @Res() response: Res) {
    const grant_type = request.body.grant_type || "";
    switch (grant_type) {
      case "authorization_code":
        return oAuth2AuthorizationCodeFlow(
          this.logger,
          this.clientService,
          this.tokenService,
          this.accountService
        );
        break;
      case "refresh_token":
          return oAuth2RefreshToken(
            this.logger,
            this.clientService,
            this.tokenService
          );
        break;
      case "client_credentials":
        return oAuth2ClientCredentials(
          this.logger,
          this.clientService,
          this.tokenService
        );
        break;
      case "device_code":
        oAuth2DeviceCode(
          this.logger,
          this.clientService,
          this.tokenService,
          this.oauthService
        );
        break;
      default:
        this.logger.error("Invalid grant type", null, true);
        return response.status(HTTPCodes.BadRequest).json({
          error: "unsupported_grant_type",
          error_description: `Unsupported grant type: ${grant_type}`,
        });
        break;
    }
  }

}
