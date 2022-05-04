/* eslint-disable babel/camelcase */
import ClientOAuth2 from "client-oauth2";
import axios from "axios";
import { IProvider, ProviderIdentity, ProviderUser } from "./IProvider";
import { Config } from "@config";
const userInfoUrl = "https://api.twitter.com/2/users/me?user.fields=profile_image_url,username";
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
    this.type = "twitter";
    this.id = id;
    this.name = name;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.clientRedirectUri = clientRedirectUri;
  }

  getCallbackUrl(authReqId, scopes) {
    const twitterAuth = new ClientOAuth2({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      accessTokenUri: "https://api.twitter.com/oauth/token",
      authorizationUri: "https://twitter.com/i/oauth2/authorize",
      redirectUri: this.clientRedirectUri
        .replace(":issuer", this.issuer)
        .replace(":providerId", this.id),
      state: authReqId,
      scopes: ['tweet.read', 'users.read'],
      query: {
        code_challenge: 'test',
        code_challenge_method: 'plain'
      }
    });

    return twitterAuth.code.getUri();
  }

  async handleCallback(authReqId, scopes, originalUrl) {
    console.log('handleCallback', originalUrl);
    
    const twitterAuth = new ClientOAuth2({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      accessTokenUri: "https://api.twitter.com/2/oauth2/token",
      authorizationUri: "https://twitter.com/i/oauth2/authorize",
      redirectUri: `${this.issuer}/v1/auth/providers/${this.id}/callback`,
      state: authReqId,
    });

    
    const token = await twitterAuth.code.getToken(originalUrl, {
      body: {
        code_verifier: 'test'
      }
    });


    if (!token) {
      ``;
      return { error: "twitter: failed to get a token" };
    }

    const twitterUser = await this.getUser(token);

    console.log('TwitterUser>>>>', twitterUser);


    if (!twitterUser) {
      return { error: "twitter: failed to get user" };
    }

    let identity: ProviderUser = {
      ...twitterUser,
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
      const twitterUser = resp.data;


      if (!twitterUser) {
        return undefined;
      }

      const user: ProviderUser = {
        id: twitterUser.data.id,
        name: twitterUser.data.name,
        username: twitterUser.data.username,
        email: null, // not get from twitter
        picture: twitterUser.data.profile_image_url,
        email_verified: false, // not get from twitter
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
