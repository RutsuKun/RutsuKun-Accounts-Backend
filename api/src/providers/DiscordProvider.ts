/* eslint-disable babel/camelcase */
import ClientOAuth2 from "client-oauth2";
import axios from "axios";
import { IProvider, ProviderIdentity, ProviderUser } from "./IProvider";
import { Config } from "@config";
const userInfoUrl = "https://discord.com/api/users/@me";
const googleScopeEmail = "email";

export class DiscordProvider implements IProvider {
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
    this.type = "discord";
    this.id = id;
    this.name = name;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.clientRedirectUri = clientRedirectUri;
  }

  getCallbackUrl(authReqId, scopes) {
    const discordAuth = new ClientOAuth2({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      accessTokenUri: "https://discord.com/api/oauth2/token",
      authorizationUri: "https://discord.com/api/oauth2/authorize",
      redirectUri: this.clientRedirectUri
        .replace(":issuer", this.issuer)
        .replace(":providerId", this.id),
      state: authReqId,
      scopes: ["email"],
      query: {
        prompt: "none",
      },
    });

    return discordAuth.code.getUri();
  }

  async handleCallback(authReqId, scopes, originalUrl) {
    const discordAuth = new ClientOAuth2({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      accessTokenUri: "https://discord.com/api/oauth2/token",
      authorizationUri: "https://discord.com/api/oauth2/authorize",
      redirectUri: `${this.issuer}/v1/auth/providers/${this.id}/callback`,
      state: authReqId,
      scopes: ["email"],
    });

    const token = await discordAuth.code.getToken(originalUrl);

    if (!token) {
      ``;
      return { error: "google: failed to get a token" };
    }

    const discordUser = await this.getUser(token);

    if (!discordUser) {
      return { error: "discord: failed to get user" };
    }

    let identity: ProviderUser = {
      ...discordUser,
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
      const discordUser = resp.data;

      console.log("discordUser", discordUser);

      if (!discordUser) {
        return undefined;
      }

      const user: ProviderUser = {
        id: discordUser.id,
        name: discordUser.username,
        username: discordUser.username,
        email: discordUser.email,
        picture: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=128`,
        email_verified: discordUser.verified,
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

export default DiscordProvider;
