import { encode } from "@blakeembrey/base64url";
import { Inject, Injectable } from "@tsed/di";
import { UseConnection } from "@tsed/typeorm";

import { TokenCheck } from "@middlewares/security";

import { OAuthRevokedTokenRepository } from "@repositories/OAuthRepository";
import { OAuthRevokedToken } from "@entities/OAuthRevokedToken";

import { LoggerService } from "@services/LoggerService";

import { Config } from "@config";

import * as jose from "jose";
import { createHash } from "crypto";
import { Req, Res } from "@tsed/common";


@Injectable()
export class TokenService {

  @Inject()
  @UseConnection("default")
  private revokedTokenRepository: OAuthRevokedTokenRepository;

  constructor(private logger: LoggerService) {
    this.logger = this.logger.child({
      label: {
        type: "token",
        name: "Token Manager",
      },
    });
  }


  public checkToken(req: Req, res: Res): Promise<any> {
    return new Promise((resolve, reject) => {
      TokenCheck(req, res)
        .then((user) => {
          resolve(user);
        })
        .catch(reject);
    });
  }

  public toAlgorithm(alg: string) {
    if (alg.endsWith("512")) return "sha512";
    if (alg.endsWith("384")) return "sha384";
    if (alg.endsWith("256")) return "sha256";

    throw new TypeError(`Unknown algorithm: ${alg}`);
  }

  public createAtHash(accessToken, alg): string {
    const hash = createHash(this.toAlgorithm(alg)).update(accessToken).digest();

    return encode(hash.slice(0, hash.length / 2));
  }

  public createCHash(code, alg): string {
    const hash = createHash(this.toAlgorithm(alg)).update(code).digest();

    return encode(hash.slice(0, hash.length / 2));
  }

  public createSHash(state, alg): string {
    const hash = createHash(this.toAlgorithm(alg)).update(state).digest();
    return encode(hash.slice(0, hash.length / 2));
  }

  public async createCodeToken(data: CodeData): Promise<string> {
    const code_token = jose.JWT.sign(
      {
        iss: Config.OAUTH2.issuer,
        sub: data.sub,
        scopes: data.scopes,
        aud: data.client_id,
        code_challenge: data.code_challenge,
        code_challenge_method: data.code_challenge_method,
        state: data.state,
        nonce: data.nonce,
        type: "code",
        timestamp: Date.now(),
      },
      Config.Token.CodeTokenPrivateKey,
      {
        algorithm: "RS256",
        expiresIn: "2m",
      }
    );
    return code_token;
  }

  public async verifyCodeToken(token: string) {
    try {
      const verify = await jose.JWT.verify(
        token,
        Config.Token.CodeTokenPublicKey,
        {
          issuer: Config.OAUTH2.issuer, //who signed the token
        }
      );
      return verify;
    } catch (err) {
      return false;
    }
  }

  public async createIDToken(data: ICreateIDTokenData): Promise<string> {
    const ctx = this;
    return new Promise((resolve, reject) => {
      const rv1 = Math.floor(Math.random() * Math.floor(254));
      const rv2 = Math.random().toString(36).substr(2, 12);
      const rv3 = Math.floor(Math.random() * Math.floor(81458));
      const auth_time = Math.floor(Date.now() / 1000);

      const id_token = jose.JWT.sign(
        {
          iss: Config.OAUTH2.issuer,
          sub: data.sub,
          aud: data.client_id,
          amr: data.amr,
          acr: data.acr,
          azp: data.client_id,
          auth_time: auth_time,
          username: data.username,
          picture: `${Config.CDN.url}/${data.sub}`,
          role: data.role,
          banned: data.banned,
          scopes: data.scopes,
          country: data.country,
          locale: data.locale,
          jti: rv1 + "-" + rv2 + "-" + rv3, // id token unique id
          at_hash: data.at_hash, //access token hash
          c_hash: data.c_hash, // code hash
          s_hash: data.s_hash, // state hash
          nonce: data.nonce,
          typ: "id_token",
        },
        Config.Token.IDTokenPrivateKey,
        {
          algorithm: "RS256",
          expiresIn: "31d",
        }
      );
      resolve(id_token);
    });
  }

  public createAccessToken(data: CreateAccessTokenData): Promise<string> {
    return new Promise((resolve, reject) => {
      let rv1 = Math.floor(Math.random() * Math.floor(254));
      let rv2 = Math.random().toString(36).substr(2, 12);
      let rv3 = Math.floor(Math.random() * Math.floor(81458));
      const access_token = jose.JWT.sign(
        {
          iss: Config.OAUTH2.issuer,
          sub: data.sub,
          aud: data.client_id,
          scopes: data.scopes,
          jti: rv1 + "-" + rv2 + "-" + rv3, // access token unique id
          timestamp: Date.now(),
          typ: "access_token",
        },
        Config.Token.AccessTokenPrivateKey,
        {
          algorithm: "RS256",
          expiresIn: `${Config.Token.AccessTokenExp.toString()}s`,
        }
      );
      resolve(access_token);
    });
  }

  public verifyAccessToken(token: string) {
    const verify = jose.JWT.verify(token, Config.Token.AccessTokenPublicKey, {
      issuer: Config.OAUTH2.issuer, //who signed the token
    });
    return verify;
  }

  public async checkTokenIsRevoked(jti: string) {
    const check = await this.revokedTokenRepository.getOneByJTI(jti);
    return !!check;
  }

  public revokeToken(item: OAuthRevokedToken) {
    return this.revokedTokenRepository.saveRevokedToken(item);
  }

  public createRefreshToken(data: CreateRefreshTokenData): Promise<string> {
    let rv1 = Math.floor(Math.random() * Math.floor(254));
    let rv2 = Math.random().toString(36).substr(2, 12);
    let rv3 = Math.floor(Math.random() * Math.floor(81458));
    return new Promise((resolve, reject) => {
      const refresh_token = jose.JWT.sign(
        {
          iss: Config.OAUTH2.issuer,
          sub: data.sub,
          aud: data.client_id,
          scopes: data.scopes,
          jti:rv1 + "-" + rv2 + "-" + rv3, // refresh token unique id
          timestamp: Date.now(),
          typ: "refresh_token",
        },
        Config.Token.RefreshTokenPrivateKey,
        {
          algorithm: "RS256",
          expiresIn: `${Config.Token.RefreshTokenExpiresIn.toString()}s`,
        }
      );
      resolve(refresh_token);
    });
  }

  public verifyRefreshToken(token: string) {
    let verify;
    try {
      verify = jose.JWT.verify(token, Config.Token.RefreshTokenPublicKey, {
        issuer: Config.OAUTH2.issuer, //who signed the token
      });
    } catch(error) {
      verify = false;
    }


    return { valid: !!verify, data: verify as RefreshTokenData };
  }

  public generateEmailCode(accountId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const email_code_token = jose.JWT.sign(
        {
          sub: accountId,
          typ: "email_code",
        },
        Config.Token.EmailCodePrivateKey,
        {
          algorithm: "RS256",
          expiresIn: "30m",
        }
      );
      resolve(email_code_token);
    });
  }

  public verifyEmailCode(token: string) {
    const verify = jose.JWT.verify(token, Config.Token.EmailCodePublicKey);
    return verify;
  }

  public createMfaToken(accountId: string, method: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const mfa_token = jose.JWT.sign(
        {
          multifactor: {
            type: method,
            accountId
          },
          typ: "mfa_token",
        },
        Config.Token.MfaTokenPrivateKey,
        {
          algorithm: "RS256",
          expiresIn: "30m",
        }
      );
      resolve(mfa_token);
    });
  }

  public verifyMfaToken(token: string) {
    let verify;
    try {
      verify = jose.JWT.verify(token, Config.Token.MfaTokenPublicKey);
    } catch(error) {
      verify = false;
    }


    return { valid: !!verify, data: verify };

  }

  public createGeneralToken(type: string, metadata: { [key: string]: any }): Promise<string> {
    return new Promise((resolve, reject) => {
      const general_token = jose.JWT.sign(
        {
          type,
          metadata
        },
        Config.Token.GeneralTokenPrivateKey,
        {
          algorithm: "RS256",
          expiresIn: "30m",
        }
      );
      resolve(general_token);
    });
  }

  public verifyGeneralToken(type: string, token: string): { valid: boolean, metadata: { [key: string]: any } } {
    let verify;
    try {
      verify = jose.JWT.verify(token, Config.Token.GeneralTokenPublicKey);
    } catch(error) {
      verify = false;
    }

    return { valid: !!verify && verify.type === type, metadata: verify.metadata };

  }
}

export interface UserData {
  name?: string;
  email: string;
  password: string;
}

export interface AuthTokenData {
  sub: string;
}

export interface CodeData {
  sub: string;
  client_id: string;
  scopes?: Array<string>;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
  nonce?: string;
}

export interface CreateAccessTokenData {
  iss?: string;
  sub: string;
  client_id: string;
  scopes: Array<string>;
}

export interface AccessTokenData {
  iss: string;
  sub: string;
  aud: string;
  scopes: Array<string>;
  jti: string;
  timestamp: number;
  iat: number;
  exp: number;
}

export interface RefreshTokenData {
  iss: string;
  sub: string;
  aud: string;
  scopes: Array<string>;
  jti: string;
  timestamp: number;
  typ: string;
  nonce: string;
  iat: number;
  exp: number;
}

export interface ICreateIDTokenData {
  sub: string;
  username: string;
  picture: string;
  email: string;
  role: string;
  banned: boolean;
  client_id: string;
  country?: string;
  scopes?: Array<string>;
  amr?: Array<string>;
  acr?: string;
  azp?: Array<string>;
  locale?: string;
  at_hash?: string;
  c_hash?: string;
  s_hash?: string;
  nonce?: string;
}

export interface CreateRefreshTokenData {
  iss?: string;
  sub: string;
  client_id: string;
  scopes: Array<string>;
  jti?: string;
}

