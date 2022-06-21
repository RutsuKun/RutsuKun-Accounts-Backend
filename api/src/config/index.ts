import * as jose from "jose";
import fs from "fs";
import keys from "./keys";
import { env } from "process";

const processEnv = {
  NODE_ENV: process.env.NODE_ENV || "development",
  API_URL: process.env.API_URL,
  API_PORT: process.env.API_PORT,
  CDN_PORT: process.env.CDN_PORT,
  CDN_URL: process.env.CDN_URL,

  FRONTEND_URL: process.env.FRONTEND_URL,

  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
  COOKIE_SECRET: process.env.COOKIE_SECRET,

  OAUTH2_ISSUER: process.env.OAUTH2_ISSUER || "",
  OAUTH2_SCOPES_SUPPORTED:
    process.env.OAUTH2_SCOPES_SUPPORTED.replace(" ", "").split(",") || [],
  OAUTH2_RESPONSE_TYPES_SUPPORTED:
    process.env.OAUTH2_RESPONSE_TYPES_SUPPORTED.split(",") || [],
  OAUTH2_RESPONSE_MODES_SUPPORTED:
    process.env.OAUTH2_RESPONSE_MODES_SUPPORTED.split(",") || [],
  OAUTH2_GRANT_TYPES_SUPPORTED:
    process.env.OAUTH2_GRANT_TYPES_SUPPORTED.split(",") || [],
  OAUTH2_TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED:
    process.env.OAUTH2_TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED.split(",") || [],
  OAUTH2_CODE_CHALLENGE_METHODS_SUPPORTED:
    process.env.OAUTH2_CODE_CHALLENGE_METHODS_SUPPORTED.split(",") || [],
  OAUTH2_SERVICE_DOCUMENTATION: process.env.OAUTH2_SERVICE_DOCUMENTATION || "",
  OAUTH2_UI_LOCALES_SUPPORTED:
    process.env.OAUTH2_UI_LOCALES_SUPPORTED.split(",") || [],
  OAUTH2_OP_POLICY_URI: process.env.OAUTH2_OP_POLICY_URI || "",
  OAUTH2_OP_TOS_URI: process.env.OAUTH2_OP_TOS_URI || "",
  ACCESS_TOKEN_EXP: process.env.ACCESS_TOKEN_EXP || 3600, // 1 hour
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || 2678400, // 31 days

  OPENID_CLAIMS_PARAMETER_SUPORTED: Boolean(process.env.OPENID_CLAIMS_PARAMETER_SUPORTED),
  OPENID_CLAIMS_SUPPORTED: process.env.OPENID_CLAIMS_SUPPORTED.replace(" ", "").split(",") || [],
  OPENID_ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED: process.env.OPENID_ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED.split(",") || [],
  OPENID_SUBJECT_TYPES_SUPPORTED: process.env.OPENID_SUBJECT_TYPES_SUPPORTED.split(",") || [],

  MAIL_HOST: process.env.MAIL_HOST,
  MAIL_PORT: process.env.MAIL_PORT,
  MAIL_SECURE: process.env.MAIL_SECURE,
  MAIL_USER: process.env.MAIL_USER,
  MAIL_PASS: process.env.MAIL_PASS,

  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
  DISCORD_CLIENT_REDIRECT_URI: process.env.DISCORD_CLIENT_REDIRECT_URI,
  DISCORD_CLIENT_CONNECT_REDIRECT_URI: process.env.DISCORD_CLIENT_CONNECT_REDIRECT_URI,

  STEAM_REALM: process.env.STEAM_REALM,
  STEAM_API_KEY: process.env.STEAM_API_KEY,
  STEAM_RETURN_URI: process.env.STEAM_RETURN_URI,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CLIENT_REDIRECT_URI: process.env.GOOGLE_CLIENT_REDIRECT_URI,
  GOOGLE_CLIENT_CONNECT_REDIRECT_URI: process.env.GOOGLE_CLIENT_CONNECT_REDIRECT_URI,

  TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
  TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
  TWITTER_CLIENT_REDIRECT_URI: process.env.TWITTER_CLIENT_REDIRECT_URI,
  TWITTER_CLIENT_CONNECT_REDIRECT_URI: process.env.TWITTER_CLIENT_CONNECT_REDIRECT_URI,

  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
  AUTH0_CLIENT_REDIRECT_URI: process.env.AUTH0_CLIENT_REDIRECT_URI,
};

const packageInfo = JSON.parse(
  fs.readFileSync("package.json", { encoding: "utf-8" })
);

export class Config {
  static get Environment() {
    return processEnv;
  }

  static get isLocal() {
    return processEnv.NODE_ENV === NodeEnvironment.Local;
  }

  static get isDevelop() {
    return processEnv.NODE_ENV === NodeEnvironment.Development;
  }

  static get isStaging() {
    return processEnv.NODE_ENV === NodeEnvironment.Staging;
  }

  static get isProd() {
    return processEnv.NODE_ENV === NodeEnvironment.Production;
  }

  static get appInfo() {
    return {
      name: packageInfo.appName,
    };
  }

  static get appPackageInfo() {
    return packageInfo;
  }

  static get Database() {
    return {
      host: env.MYSQL_HOST,
      user: env.MYSQL_USER,
      pass: env.MYSQL_PASS,
      database: env.MYSQL_DATABASE,
    };
  }

  static get API() {
    return {
      port: Number(processEnv.API_PORT),
      url: processEnv.API_URL,
      cookieDomain: processEnv.COOKIE_DOMAIN,
      cookieSecret: processEnv.COOKIE_SECRET
    };
  }

  static get AUTHN() {
    return {
      supported_authn_methods: ["otp"]
    }
  }

  static get AUTH() {
    return {
      providers: [
        {
          type: "google",
          id: "google",
          name: "Google",
          config: {
            clientId: processEnv.GOOGLE_CLIENT_ID,
            clientSecret: processEnv.GOOGLE_CLIENT_SECRET,
            clientRedirectUri: processEnv.GOOGLE_CLIENT_REDIRECT_URI,
            clientConnectRedirectUri: processEnv.GOOGLE_CLIENT_CONNECT_REDIRECT_URI,
          },
        },
        {
          type: "discord",
          id: "discord",
          name: "Discord",
          config: {
            clientId: processEnv.DISCORD_CLIENT_ID,
            clientSecret: processEnv.DISCORD_CLIENT_SECRET,
            clientRedirectUri: processEnv.DISCORD_CLIENT_REDIRECT_URI,
            clientConnectRedirectUri: processEnv.DISCORD_CLIENT_CONNECT_REDIRECT_URI,
          },
        },
        {
          type: "twitter",
          id: "twitter",
          name: "Twitter",
          config: {
            clientId: processEnv.TWITTER_CLIENT_ID,
            clientSecret: processEnv.TWITTER_CLIENT_SECRET,
            clientRedirectUri: processEnv.TWITTER_CLIENT_REDIRECT_URI,
            clientConnectRedirectUri: processEnv.TWITTER_CLIENT_CONNECT_REDIRECT_URI,
          },
        },
      ],
    };
  }

  static get FRONTEND() {
    return {
      url: processEnv.FRONTEND_URL,
    };
  }

  static get OAUTH2() {
    return {
      issuer: processEnv.OAUTH2_ISSUER,
      authorization_endpoint: `${processEnv.OAUTH2_ISSUER}/v1/oauth2/authorize`,
      registration_endpoint: `${processEnv.API_URL}/v1/clients`,
      token_endpoint: `${processEnv.OAUTH2_ISSUER}/v1/oauth2/token`,
      introspection_endpoint: `${processEnv.OAUTH2_ISSUER}/v1/oauth2/token/info`,
      revocation_endpoint: `${processEnv.OAUTH2_ISSUER}/v1/oauth2/token/revoke`,
      jwks_uri: `${processEnv.API_URL}/.well-known/jwks.json`,
      userinfo_endpoint: `${processEnv.OAUTH2_ISSUER}/v1/oauth2/userinfo`,
      scopes_supported: processEnv.OAUTH2_SCOPES_SUPPORTED,
      response_types_supported: processEnv.OAUTH2_RESPONSE_TYPES_SUPPORTED,
      response_modes_supported: processEnv.OAUTH2_RESPONSE_MODES_SUPPORTED,
      grant_types_supported: processEnv.OAUTH2_GRANT_TYPES_SUPPORTED,
      token_endpoint_auth_methods_supported:
        processEnv.OAUTH2_TOKEN_ENDPOINT_AUTH_METHOD_SUPPORTED,
      code_challenge_methods_supported:
        processEnv.OAUTH2_CODE_CHALLENGE_METHODS_SUPPORTED,
      service_documentation: processEnv.OAUTH2_SERVICE_DOCUMENTATION,
      ui_locales_supported: processEnv.OAUTH2_UI_LOCALES_SUPPORTED,
      op_policy_uri: processEnv.OAUTH2_OP_POLICY_URI,
      op_tos_uri: processEnv.OAUTH2_OP_TOS_URI,
    };
  }

  static get OpenID() {
    return {
      end_session_endpoint: `${processEnv.API_URL}/v1/auth/session/end`,
      claims_parameter_supported: processEnv.OPENID_CLAIMS_PARAMETER_SUPORTED,
      claims_supported: processEnv.OPENID_CLAIMS_SUPPORTED,
      id_token_signing_alg_values_supported: processEnv.OPENID_ID_TOKEN_SIGNING_ALG_VALUES_SUPPORTED,
      subject_types_supported: processEnv.OPENID_SUBJECT_TYPES_SUPPORTED,
    };
  }

  static get Token() {
    return {
      AccessTokenExp: processEnv.ACCESS_TOKEN_EXP,
      AccessTokenPrivateKey: jose.JWK.importKey(keys.accessTokenPrivateKey()),
      AccessTokenPublicKey: jose.JWK.importKey(keys.accessTokenPublicKey()),
      RefreshTokenPrivateKey: jose.JWK.importKey(keys.accessTokenPrivateKey()),
      RefreshTokenPublicKey: jose.JWK.importKey(keys.accessTokenPublicKey()),
      RefreshTokenExpiresIn: processEnv.REFRESH_TOKEN_EXPIRES_IN,
      IDTokenPrivateKey: jose.JWK.importKey(keys.idTokenPrivateKey()),
      IDTokenPublicKey: jose.JWK.importKey(keys.idTokenPublicKey()),
      CodeTokenPrivateKey: jose.JWK.importKey(keys.codeTokenPrivateKey()),
      CodeTokenPublicKey: jose.JWK.importKey(keys.codeTokenPublicKey()),
      EmailCodePrivateKey: jose.JWK.importKey(keys.emailTokenPrivateKey()),
      EmailCodePublicKey: jose.JWK.importKey(keys.emailTokenPublicKey()),
      MfaTokenPrivateKey: jose.JWK.importKey(keys.mfaTokenPrivateKey()),
      MfaTokenPublicKey: jose.JWK.importKey(keys.mfaTokenPublicKey()),
      GeneralTokenPrivateKey: jose.JWK.importKey(keys.generalTokenPrivateKey()),
      GeneralTokenPublicKey: jose.JWK.importKey(keys.generalTokenPublicKey()),
    };
  }

  static get CDN() {
    return {
      port: Number(processEnv.CDN_PORT),
      url: processEnv.CDN_URL,
    };
  }

  static get Discord() {
    return {
      token: processEnv.DISCORD_TOKEN,
      ClientID: processEnv.DISCORD_CLIENT_ID,
      ClientSecret: processEnv.DISCORD_CLIENT_SECRET,
      ClientRedirectUri: processEnv.DISCORD_CLIENT_REDIRECT_URI,
    };
  }

  static get Steam() {
    return {
      Realm: processEnv.STEAM_REALM,
      ApiKey: processEnv.STEAM_API_KEY,
      ReturnUri: processEnv.STEAM_RETURN_URI,
    };
  }

  static get Google() {
    return {
      ClientID: processEnv.GOOGLE_CLIENT_ID,
      ClientSecret: processEnv.GOOGLE_CLIENT_SECRET,
      ClientRedirectUri: processEnv.GOOGLE_CLIENT_REDIRECT_URI,
    };
  }

  static get Auth0() {
    return {
      Domain: processEnv.AUTH0_DOMAIN,
      ClientID: processEnv.AUTH0_CLIENT_ID,
      ClientSecret: processEnv.AUTH0_CLIENT_SECRET,
      ClientRedirectUri: processEnv.AUTH0_CLIENT_REDIRECT_URI,
    };
  }

  static get Mail() {
    return {
      host: processEnv.MAIL_HOST,
      port: Number(processEnv.MAIL_PORT),
      secure: Boolean(processEnv.MAIL_SECURE),
      user: processEnv.MAIL_USER,
      pass: processEnv.MAIL_PASS,
    };
  }
}

export enum NodeEnvironment {
  Local = "local",
  Production = "production",
  Staging = "staging",
  Development = "development",
  Testing = "testing",
}
