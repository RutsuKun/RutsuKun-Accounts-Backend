import { Controller, Post, Req, Res, UseBefore } from "@tsed/common";

// SERVICES

import { AccessTokenData, RefreshTokenData, TokenService } from "@services/TokenService";
import { AccountsService } from "@services/AccountsService";
import { ClientService } from "@services/ClientService";

// MIDDLEWARES

import {
  CheckClientCredentialsMiddleware,
  CheckClientMiddleware,
} from "@middlewares/client.middleware";

import { HTTP } from "@utils";

@Controller("/oauth2/token/revoke")
export class OAuth2TokenRevokeRoute {
  constructor(
    private tokenService: TokenService,
    private accountsService: AccountsService,
    private clientService: ClientService
  ) {}

  @Post()
  @UseBefore(CheckClientMiddleware)
  @UseBefore(CheckClientCredentialsMiddleware)
  public async postTokenRevoke(@Req() request: Req, @Res() response: Res) {
    const { token, token_type_hint, client_id } = request.body;
    let clientSecret;

    if (
      token_type_hint === "access_token" ||
      token_type_hint === "refresh_token"
    ) {
      if (!token)
        return HTTP.OAuth2InvalidRequest(request, response, "Bad Request");

      switch (token_type_hint) {
        case "access_token":
          try {
            const tokenData = this.tokenService.verifyAccessToken(
                token
            ) as AccessTokenData;

            if(tokenData.aud !== client_id) 
                return HTTP.OAuth2InvalidRequest(request, response, "Invalid client");
            const isRevoked = await this.tokenService.checkTokenIsRevoked(
                tokenData.jti
            );
            if (isRevoked) {
                HTTP.OAuth2InvalidRequest(
                request,
                response,
                `access token already revoked`
                );
            } else {
                const account = await this.accountsService.getAccountByUUID(
                tokenData.sub
                );
                const client = await this.clientService.getClientByClientId(
                tokenData.aud
                );

                await this.tokenService.revokeToken({
                type: "access_token",
                jti: tokenData.jti,
                client: client,
                account: account,
                exp: tokenData.exp,
                });
                return response.status(200).json({
                success: true,
                });
            }
          } catch (err) {
            HTTP.OAuth2InvalidRequest(request, response, `Invalid token`);
          }
          break;
        case "refresh_token":

            const tokenData = this.tokenService.verifyRefreshToken(
                token
            );

            if(!tokenData.valid) return HTTP.OAuth2InvalidRequest(request, response, `Invalid token`);

            if(tokenData.data.aud !== client_id) 
                return HTTP.OAuth2InvalidRequest(request, response, "Invalid client");
            const isRevoked = await this.tokenService.checkTokenIsRevoked(
                tokenData.data.jti
            );
            if (isRevoked) {
                HTTP.OAuth2InvalidRequest( request, response, `refresh token already revoked`);
            } else {
                const account = await this.accountsService.getAccountByUUID(tokenData.data.sub);
                const client = await this.clientService.getClientByClientId(tokenData.data.aud);

                await this.tokenService.revokeToken({
                  type: "refresh_token",
                  jti: tokenData.data.jti,
                  client: client,
                  account: account,
                  exp: tokenData.data.exp,
                });
                return response.status(200).json({ success: true });
            }

        break;
        default:
          HTTP.OAuth2InvalidRequest(
            request,
            response,
            `token_type_hint refresh_token not supported yet`
          );
          break;
      }
    } else {
      HTTP.OAuth2InvalidRequest(
        request,
        response,
        `TODO`
      );
    }
  }
}
