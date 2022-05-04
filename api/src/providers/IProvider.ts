export interface IProvider {
  type: string;
  id: string;
  name: string;
  clientId: string;
  clientSecret: string;
  issuer: string;

  getCallbackUrl(authReqId: string, scopes: string[]): string;

  handleCallback(
    authReqId: string,
    scopes: string[],
    originalUrl: string
  ): Promise<ProviderIdentity | { error: string }>;

  getUser(token: string): Promise<ProviderUser | undefined>;

  getEmail?(token: string): Promise<{ email: string }> | undefined;

  getScopes(scopes: string[]): string;
}

export interface ProviderUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
}

export interface ProviderIdentity extends ProviderUser {
  data: {
    access_token: string;
  };
}
