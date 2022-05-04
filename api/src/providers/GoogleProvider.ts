/* eslint-disable babel/camelcase */
import ClientOAuth2 from "client-oauth2";
import axios from "axios";
import { IProvider, ProviderIdentity, ProviderUser } from "./IProvider";
import { Config } from "@config";
const userInfoUrl = "https://openidconnect.googleapis.com/v1/userinfo";
const googleScopeEmail = "email";

export class GoogleProvider implements IProvider {
  type: string = null;
  id: string = null;
  name: string = null;
  clientId: string = null;
  clientSecret: string = null;
  clientRedirectUri: string = null;

  issuer = Config.API.url;

  constructor(
    id: string,
    name: string,
    clientId: string,
    clientSecret: string,
    clientRedirectUri: string
  ) {
    this.type = "github";
    this.id = id;
    this.name = name;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.clientRedirectUri = clientRedirectUri;
  }

  getCallbackUrl(authReqId, scopes) {
    const githubAuth = new ClientOAuth2({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      accessTokenUri: "https://oauth2.googleapis.com/token",
      authorizationUri: "https://accounts.google.com/o/oauth2/v2/auth",
      redirectUri: this.clientRedirectUri
        .replace(":issuer", this.issuer)
        .replace(":providerId", this.id),
      state: authReqId,
      scopes: scopes,
      query: {
        prompt: "consent",
      },
    });

    return githubAuth.code.getUri();
  }

  async handleCallback(authReqId, scopes, originalUrl) {
    const googleAuth = new ClientOAuth2({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      accessTokenUri: "https://oauth2.googleapis.com/token",
      authorizationUri: "https://accounts.google.com/o/oauth2/v2/auth",
      redirectUri: `${this.issuer}/v1/auth/providers/${this.id}/callback`,
      state: authReqId,
      scopes: scopes,
    });

    const token = await googleAuth.code.getToken(originalUrl);

    if (!token) {
      return { error: "google: failed to get a token" };
    }

    const googleUser = await this.getUser(token);

    if (!googleUser) {
      return { error: "google: failed to get user" };
    }

    let identity: ProviderUser = {
      ...googleUser,
    };

    let identityData: ProviderIdentity = {
      ...identity,
      data: {
        access_token: token.accessToken,
      },
    };

    return identityData;
  }

  async getUser(token) {
    try {
      const userReq = token.sign({
        method: "GET",
        url: `${userInfoUrl}`,
      });
      const resp = await axios(userReq);
      const googleUser = resp.data;

      if (!googleUser) {
        return undefined;
      }

      const user: ProviderUser = {
        id: googleUser.sub,
        name: googleUser.name,
        username: googleUser.login,
        email: googleUser.email,
        picture: googleUser.picture,
        email_verified: googleUser.email_verified,
      };

      return user;
    } catch {
      return undefined;
    }
  }

  getScopes(scopes) {
    const googleScopes = [];

    if (scopes.includes("email")) {
      googleScopes.push(googleScopeEmail);
    }

    return googleScopes.join(" ");
  }
}

export default GoogleProvider;
