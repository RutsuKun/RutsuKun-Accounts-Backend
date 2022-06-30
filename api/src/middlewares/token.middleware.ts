import {
  Context,
  Logger,
  Middleware,
  Next,
  ProviderScope,
  Req,
  Res,
  Scope,
} from "@tsed/common";

import { SessionService } from "@services/SessionService";
import { HTTP } from "@utils";
import { AccessTokenData, TokenService } from "@services/TokenService";

@Middleware()
@Scope(ProviderScope.REQUEST)
export class CheckTokenRevokedMiddleware {
  constructor(private tokenService: TokenService) {}

  async use(
    @Req() request: Req,
    @Res() response: Res,
    @Next() next: Next,
    @Context() context: Context
  ) {
    let tokenData: AccessTokenData;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.split(" ")[0] === "Bearer") {
      const token = authHeader.split(" ")[1];
      tokenData = this.tokenService.verifyAccessToken(
        token
      ) as AccessTokenData;
    }

    const isRevoked = await this.tokenService.checkTokenIsRevoked(
      tokenData.jti
    );

    if(!isRevoked) return next();

    return HTTP.OAuth2InvalidRequest(request, response, 'Access Token is revoked');
  }
}
