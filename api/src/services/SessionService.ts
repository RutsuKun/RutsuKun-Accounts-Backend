import { Injectable, ProviderScope, Request } from "@tsed/common";
import { AccountsService } from "./AccountsService";
import { LoggerService } from "./LoggerService";
@Injectable({
  scope: ProviderScope.REQUEST,
})
export class SessionService {
  public session;
  private clientQuery: SessionClientQuery;
  private client: SessionClient;
  private currentSessionUuid: string;
  private idp: SessionIDP;
  private sso: ISessionSSO[] = [];
  private action: any;
  private flow: "auth" | "oauth";
  private oauth: {
    client_id: string;
  };
  private browserSessions: SessionBrowserSession[] = [];
  private passport: any;
  private error: any;

  private logger;

  constructor(
    private loggerService: LoggerService,
    private accountsService: AccountsService
  ) {
    this.logger = this.loggerService.child({
      label: {
        type: "session",
        name: "Session Serivice",
      },
    });
    return this;
  }

  needReAuth(): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      const currentTime = Math.floor(Date.now() / 1000);

      const authTime = this.getIDP.auth_time;
      const reauthTime = this.getIDP.reauth_time;

      const timeDifferenceAuth = currentTime - authTime;
      const timeDifferenceReAuth = currentTime - reauthTime;

      console.log(
        "timeDifferenceAuth",
        timeDifferenceAuth,
        " sekund / ",
        3600,
        " sekund"
      );
      console.log(
        "timeDifferenceReAuth",
        timeDifferenceReAuth,
        " sekund / ",
        600,
        " sekund"
      );

      return resolve(false);

      // 1 h after full auth
      if (timeDifferenceAuth > 3600) {
        resolve(true);
      }
      // 10 min after reauth or first auth
      if (timeDifferenceReAuth > 6090000) {
        this.loggerService.info(this.getCurrentSessionAccount.username + " needs reauth.");
        resolve(true);
      }

      resolve(false);
    });
  }

  async setSession(req: Request) {
    const session_id = req["sessionID"];
    this.logger.info("session_id", session_id);

    this.session = req.session;
    const currentSessionUuid = req.session.currentSessionUuid;
    const clientQuery = req.session.clientFromQuery ?? {};
    const client = req.session.client;
    const idp = req.session.idp;
    const sso = req.session.sso;
    const action = req.session.action;
    const error = req.session.error;

    const flow = req.body.flow || req.session.flow || "auth";
    const prompt = req.body.prompt ? req.body.prompt : null;
    console.log("body", req.body);
    
    console.log('prompt', prompt);
    

    const browserSessions = await this.accountsService.getBrowserSessionsEndpoint(session_id);
    this.setBrowserSessions(browserSessions);

    if (currentSessionUuid) this.setCurrentSessionUuid(currentSessionUuid);
    this.setClientQuery(clientQuery);
    if (client) this.setClient(client);
    if (idp) this.setIDP(idp);
    if (sso) this.setSSO(sso);
    if (action) this.setAction(action);
    if (clientQuery) this.setPrompt(prompt);
    this.setFlow(flow);
    if (error) this.setError(error);

    return this;
  }

  get getSession(): SessionData {
    return this.session;
  }

  async saveSession() {
    try {
      return new Promise(async (resolve, reject) => {
        if (this.browserSessions) {
          this.session.browserSessions = this.browserSessions;
        } else {
          delete this.session.browserSessions;
        }

        if (this.currentSessionUuid) {
          this.session.currentSessionUuid = this.currentSessionUuid;
        } else {
          this.session.currentSessionUuid = null;
        }

        if (this.clientQuery) {
          this.session.clientFromQuery = this.clientQuery;
        } else {
          delete this.session.clientFromQuery;
        }

        if (this.client) {
          this.session.client = this.client;
        } else {
          delete this.session.client;
        }

        if (this.idp) {
          this.session.idp = this.idp;
        } else {
          delete this.session.idp;
        }

        if (this.sso) {
          this.session.sso = this.sso;
        } else {
          delete this.session.sso;
        }

        if (this.action) {
          this.session.action = this.action;
        } else {
          delete this.session.action;
        }

        if (this.flow) {
          this.session.flow = this.flow;
        } else {
          delete this.session.flow;
        }

        if (this.passport) {
          this.session.passport = this.passport;
        } else {
          delete this.session.passport;
        }

        this.session.save(() => {
          this.loggerService.info("Session saved: " + this.session.id);
          resolve(true);
        });
      });
    } catch (err) {
      console.log("important error", err);
    }
  }

  // CLIENT QUERY //

  setClientQuery(client) {
    this.clientQuery = client;
    return this;
  }

  get getClientQuery(): SessionClientQuery {
    return this.clientQuery;
  }

  delClientQuery() {
    this.loggerService.info("function delClientQuery");
    this.clientQuery = undefined;
    return this;
  }

  // CLIENT //

  setClient(client) {
    this.client = client;
    return this;
  }

  get getClient(): SessionClient {
    return this.client;
  }

  delClient() {
    this.client = undefined;
    return this;
  }

  // SESSION //

  setBrowserSessions(sessions) {
    this.browserSessions = sessions;
    return this;
  }

  addBrowserSession(session: SessionBrowserSession) {
    this.browserSessions.push(session);
    return this;
  }

  get getBrowserSessions() {
    return this.browserSessions;
  }

  get getCurrentBrowserSession(): SessionBrowserSession {
    const currentSession = this.browserSessions.find((session) => session && session.uuid === this.getCurrentSessionUuid)
    if (!currentSession) return null;

    return currentSession;
  }

  checkSessionExists(uuid: string) {
    return !!this.browserSessions.find((session) => session.uuid === uuid);
  }

  setCurrentSessionUuid(uuid: string) {
    console.log("setCurrentSessionUuid ", uuid);
    if (this.checkSessionExists(uuid)) {
      this.currentSessionUuid = uuid;
    }
    return this;
  }

  changeSession(uuid: string): boolean {
    if (!this.browserSessions.length || !this.checkSessionExists(uuid) || uuid === this.currentSessionUuid) return false;
    this.setCurrentSessionUuid(uuid);
    return true;
  }

  get getCurrentSessionUuid(): string {
    return this.currentSessionUuid;
  }

  // SESSION ACCOUNT //

  get getCurrentSessionAccount(): SessionUser {
    const currentAccount = this.browserSessions.find((session) => session.uuid === this.getCurrentSessionUuid);
    
    if (!currentAccount) {
      return { logged: false };
    }

    return {
      ...currentAccount.account,
      logged: true
    }
  }

  async deleteCurrentBrowserSession() {
    const currentBrowserSession = this.browserSessions.find((session) => session.uuid === this.getCurrentSessionUuid);
    await this.accountsService.deleteAccountSession(currentBrowserSession.uuid, currentBrowserSession.account.uuid);
    this.browserSessions = this.browserSessions.filter((session) => session.uuid !== currentBrowserSession.uuid);
    this.currentSessionUuid = null;
    return this;
  }

  checkAccountSessionExists(account_uuid: string) {
    const findSession = this.browserSessions.find((session) => session && session.account.uuid === account_uuid);
    return findSession;
  }

  // IDP - Identity Provider //

  setIDP(idp: SessionIDP) {
    this.idp = idp;
    return this;
  }

  get getIDP(): SessionIDP {
    return this.idp;
  }

  delIDP() {
    this.loggerService.info("function delIDP");
    this.idp = undefined;
    return this;
  }

  // SSO

  setSSO(sso: ISessionSSO[]) {
    this.sso = sso;
    return this;
  }

  addSSO(sso: ISessionSSO) {
    this.loggerService.info("function addSSO", sso);
    this.sso.push(sso);
    return sso;
  }

  deleteSso(nameId: string, serviceProviderId: string) {
    this.sso = this.sso.filter(
      (sso) =>
        sso.nameId !== nameId && sso.serviceProviderId !== serviceProviderId
    );
  }

  get getSso() {
    return this.sso;
  }

  getSsoByNameId(nameId: string) {
    return this.sso.find((ssoSession) => ssoSession.nameId === nameId);
  }

  // ACTION //

  get getAction() {
    return this.action;
  }

  setAction(action) {
    this.action = action;
    return this;
  }

  delAction() {
    this.loggerService.info("function delAction");
    this.action = undefined;
    return this;
  }

  // FLOW //

  get getFlow() {
    return this.flow;
  }

  setFlow(flow) {
    this.flow = flow;
    return this;
  }

  delFlow() {
    this.loggerService.info("function delFlow");
    this.flow = undefined;
    return this;
  }

  // PROMPT

  get getPrompt(): ClientPromptType {
    return this.clientQuery.prompt;
  }

  setPrompt(prompt: ClientPromptType) {    
    console.log("this.clientQuery ", this.clientQuery);
    
    this.clientQuery.prompt = prompt;
    return this;
  }

  delPrompt() {
    this.loggerService.info("function delPrompt");
    this.clientQuery.prompt = null;
    return this;
  }

  // OAUTH //

  get getOAuth() {
    return this.oauth;
  }

  setOAuth(oauth) {
    this.oauth = oauth;
    return this;
  }

  delOAuth() {
    this.loggerService.info("function delOAuth");
    this.oauth = null;
    return this;
  }

  // PASSPORT //

  get getPassport() {
    return this.action;
  }

  setPassport(passport) {
    this.passport = passport;
    return this;
  }

  delPassport() {
    this.loggerService.info("function delPassport");
    this.passport = undefined;
    return this;
  }

  // ERROR //

  setError(error) {
    this.error = error;
    return this;
  }

  get getError(): any {
    return this.error;
  }

  delError() {
    this.loggerService.info("function delError");
    this.error = undefined;
    return this;
  }
}

export interface SessionData {
  id: string;
  browserSessions: SessionBrowserSession[];
  clientFromQuery: SessionClientQuery;
  client: SessionClient;
  cookie: any;
  user: SessionUser;
  idp: SessionIDP;
  action: {
    type: string;
    [index: string]: any;
  };
  oauth: {
    client_id: string;
  };
}

export interface SessionBrowserSession {
  uuid: string;
  session_id: string;
  session_issued: Date;
  session_expires: Date;
  amr: string[];
  idp: string; // identity provider
  account: SessionUser;
}

export interface SessionClientQuery {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  acr_values: string;
  scope: string;
  state: string;
  nonce: string;
  prompt: ClientPromptType;
  code_challenge: string;
  code_challenge_method: string;
}

export type ClientPromptType = "login" | "signup" | "consent" | "select_account" | "none" | null;

export interface SessionClient {
  registrationEnabled: boolean;
  loginEnabled: boolean;
  client_id: string;
  name: string;
  third_party: boolean;
  grant_types: Array<string>;
  response_types: Array<string>;
  redirect_uris: Array<string>;
  logo: string;
  policy_uri: string;
  tos_uri: string;
  consent: boolean;
  state: string;
  type: string;
  website: string;
  privacy_policy: string;
  tos: string;
  verified: boolean;
}

export interface SessionUser {
  logged?: boolean;
  uuid?: string;
  username?: string;
  email?: string;
  picture?: string;
  role?: string;
}

export interface SessionIDP {
  auth_time: number;
  reauth_time: number;
  used_authn_methods: IUsedAuthnMethod[];
}

export interface IUsedAuthnMethod {
  method: 'OTP';
  first_used_date: Date;
  last_used_date: Date;
}

export interface ISessionSSO {
  serviceProviderId: string;
  nameId: string;
  nameIdFormat: string;
  sessionIndex: string;
  serviceProviderLogoutURL: string;
}