import { Inject, Injectable } from "@tsed/di";
import { UseConnection } from "@tsed/typeorm";
import { AccountRepository } from "@repositories/AccountRepository";
import { AccountEntity } from "@entities/Account";
import { LoggerService } from "@services/LoggerService";
import { TokenService } from "@services/TokenService";
import { Email } from "@entities/Email";
import { EmailRepository } from "@repositories/EmailRepository";
import { AccountProviderRepository } from "@repositories/AccountProviderRepository";
import { AccountProvider } from "@entities/AccountProvider";
import { Validate } from "@utils";
import bcrypt from "bcryptjs";
import { AccountAuthnMethodRepository } from "@repositories/AccountAuthnMethod.repository";
import { AuthenticationMethods } from "common/interfaces/authentication.interface";
import { AccountAuthnMethod } from "@entities/AccountAuthnMethod";
import { AccountSessionRepository } from "@repositories/AccountSessionRepository";
import { AccountSession } from "@entities/AccountSession";
import { OrganizationService } from "./OrganizationService";
import _ from "lodash";
import { GroupService } from "./GroupService";

@Injectable()
export class AccountsService {
  @Inject()
  @UseConnection("default")
  private accountRepository: AccountRepository;

  @Inject()
  @UseConnection("default")
  private emailRepository: EmailRepository;

  @Inject()
  @UseConnection("default")
  private accountsProviderRepository: AccountProviderRepository;

  @Inject()
  @UseConnection("default")
  private accountsAuthnMethodRepository: AccountAuthnMethodRepository;

  @Inject()
  @UseConnection("default")
  private accountsSessionRepository: AccountSessionRepository;

  constructor(
    private logger: LoggerService,
    private tokenService: TokenService,
    private organizationService: OrganizationService,
    private groupService: GroupService,
  ) {
    this.logger = this.logger.child({
      label: { name: "AccountsService", type: "service" },
    });
  }

  async signup({
    email,
    username,
    password,
    repassword,
  }): Promise<AccountEntity> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      if (Validate.isNull(email) || Validate.isEmpty(email)) {
        ctx.logger.error("Email missing", null, true);
        return reject("ACCOUNT_EMAIL_MISSING");
      }
      if (Validate.isNull(username) || Validate.isEmpty(username)) {
        ctx.logger.error("Username missing", null, true);
        return reject("ACCOUNT_USERNAME_MISSING");
      }
      if (Validate.isNull(password) || Validate.isEmpty(password)) {
        ctx.logger.error("Password missing", null, true);
        return reject("ACCOUNT_PASSWORD_MISSING");
      }
      if (Validate.isNull(repassword) || Validate.isEmpty(repassword)) {
        ctx.logger.error("Re password missing", null, true);
        return reject("ACCOUNT_REPASSWORD_MISSING");
      }

      if (!Validate.isEqual(password, repassword)) {
        ctx.logger.error("Account passwords doesn't match", null, true);
        return reject("ACCOUNT_PASSWORDS_NOT_MATCH");
      }

      const accountByEmail = await ctx.emailRepository.findByPrimaryEmail(
        email
      );
      if (accountByEmail) {
        ctx.logger.error("Account email taken", null, true);
        return reject("ACCOUNT_EMAIL_TAKEN");
      }

      const accountByUsername = await ctx.accountRepository.findByUsername(
        username
      );
      if (accountByUsername) {
        ctx.logger.error("Account username taken", null, true);
        return reject("ACCOUNT_USERNAME_TAKEN");
      }

      const passwordHash = bcrypt.hashSync(password, 10);

      const accountData = new AccountEntity({
        username,
        password: passwordHash,
      });

      accountData.addEmail({
        email: email,
        email_verified: false,
        primary: true,
        account: accountData,
      });

      const account = await this.accountRepository.save(accountData);

      ctx.logger.success("created account " + account, null, true);

      // ctx.token.generateEmailCode(account.uuid).then((token) => {
      // ctx.mail.sendAccountVerificationEmail(account.email, account.username, token);
      // });

      // if (
      //     req.session.action &&
      //     req.session.action.type === "signup-connection"
      // ) {
      //     await account.providers.push({
      //         provider: req.session.action.provider,
      //         uid: req.session.action.id,
      //     });
      //     await account.save();
      //     delete req.session.action;
      // }

      resolve(account);
    });
  }

  async signupByProvider({
    provider,
    id,
    picture,
    username,
    name,
    email,
    email_verified = false,
  }): Promise<AccountEntity> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const accountByProvider =
        await ctx.accountsProviderRepository.findByProvider(id, provider);
      const accountByEmail = await ctx.emailRepository.findByPrimaryEmail(
        email
      );

      if (accountByProvider) {
        ctx.logger.error("Provider already connected to account", null, true);
        return reject("ACCOUNT_PROVIDER_ALREADY_CONNECTED");
      }

      if (accountByEmail) {
        ctx.logger.error("Account email taken", null, true);
        return reject("ACCOUNT_EMAIL_TAKEN");
      }

      const accountByUsername = await ctx.accountRepository.findByUsername(
        username
      );
      if (accountByUsername) {
        ctx.logger.error("Account username taken", null, true);
        return reject("ACCOUNT_USERNAME_TAKEN");
      }

      const accountData = new AccountEntity({
        username: username,
        password: null,
        avatar: picture,
      });

      accountData.addEmail({
        email: email,
        email_verified: email_verified,
        primary: true,
        account: accountData,
      });

      accountData.addProvider({
        provider,
        id,
        name,
        email,
        picture,
        account: accountData,
      });

      const account = await this.accountRepository.save(accountData);

      ctx.logger.success("created account ", account, true);

      resolve(account);
    });
  }

  public getAccountInfo(accountId: string): Promise<any> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const account = await ctx.accountRepository.findByUUID(accountId);
      resolve({
        sub: account.uuid,
        id: account.uuid,
        username: account.username,
        picture: account.avatar,
        role: account.role,
        emails: account.emails,
      });
    });
  }

  public listAccounts(): Promise<AccountEntity[]> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const accounts = await this.accountRepository.findAll();
      resolve(accounts);
    });
  }
  public listAccountsEndpoint(): Promise<any> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const list = await this.accountRepository.find({
        relations: ["emails", "groups"],
      });

      const accounts = [];
      await list.forEach((item, index) => {
        delete item.password;
        accounts.push({
          uuid: item.uuid,
          username: item.username,
          picture: item.avatar,
          role: item.role,
          state: item.state,
          banned: item.banned,
          clients: item.clients,
          providers: item.providers,
          email: item.getPrimaryEmail(),
          groups: item.groups
        });
      });
      resolve(accounts);
    });
  }
  public async getAccountEndpoint(uuid: string): Promise<AccountEntity> {
    const foundAccount = await this.accountRepository.findOne(
      { uuid },
      { relations: ["emails", "accountAclScopes", "accountAclScopes.scope"] }
    );

    return {
      id: foundAccount.id,
      uuid: foundAccount.uuid,
      username: foundAccount.username,
      avatar: foundAccount.avatar,
      role: foundAccount.role,
      state: foundAccount.state,
      banned: foundAccount.banned,
      clients: foundAccount.clients,
      providers: foundAccount.providers,
      emails: foundAccount.emails,
      accountAclScopes: foundAccount.accountAclScopes,
    };
  }
  public deleteAccountEndpoint(accountId): Promise<any> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const account = await this.accountRepository.findByUUID(accountId);
      if (account) {
        if (account.state === "DELATED") {
          return reject({
            success: false,
            error: "Account already delated",
          });
        }
        account.state = "DELATED";
        const deleted = await this.accountRepository.save(account);
        if (deleted.state === "DELETED") {
          return resolve({
            success: true,
            message: "Account delated",
          });
        }
      } else {
        return reject({
          success: false,
          error: "Account doesn't exist",
        });
      }
    });
  }
  public getAccountByUUIDEndpoint(accountId: string): Promise<AccountEntity> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const account = await this.accountRepository.findByUUID(accountId);
      if (account) {
        resolve({
          uuid: account.uuid,
          username: account.username,
          emails: account.emails,
          avatar: account.avatar,
          role: account.role,
          state: account.state,
          banned: account.banned,
          clients: account.clients,
          providers: account.providers,
        });
      } else {
        reject({
          success: false,
          error: "Account doesn't exist",
        });
      }
    });
  }

  public getAccountGroupsByUUID(uuid: string) {
    return this.accountRepository.findOne({
      where: { uuid },
      relations: ["groups"],
    });
  }

  public async getAllPermissionsByUUID(uuid: string) {

    let organizatonMember = await this.organizationService.getOrganizationsMemberWithPermissions(uuid);

    // let organizationGroups = ;

    let accountWithAclScopes = await this.getAccountAclPermissionsByUUID(uuid);


    let accountWithAssignedPermissions = await this.getAccountPermissionsByUUID(uuid);

    const organizatonMemberPermissions = organizatonMember.length ? organizatonMember.map((member) => member.scopes.map((scope) => (
      {
        name: scope.name,
        source: {
          type: "ORGANIZATION-MEMBER",
          organization: {
            id: member.organization.id,
            uuid: member.organization.uuid,
            name: member.organization.name
          },
          member: {
            id: member.account.id,
            uuid: member.account.uuid,
            picture: member.account.avatar,
            username: member.account.username 
          }
        },
        sources: []
      }
    ))).reduce((prev, curr, index, array) => ([...prev, ...curr])) as any : []


    const organizationMemberGroupsPermissions =  organizatonMember.length ?
    organizatonMember.map( (member) => member.assignedGroups.length ?
      member.assignedGroups.map( (group) => 
        group.scopes ? group.scopes.map( (scope) => 
        ({
            name: scope.name,
            source: { 
              type: "ORGANIZATION-GROUP",
              organization: {
                id: member.organization.id,
                uuid: member.organization.uuid,
                name: member.organization.name
              },
              group: {
                id: group.assignedGroup.id,
                uuid: group.assignedGroup.uuid,
                name: group.assignedGroup.name
              },
            },
            sources: []
          })
        ) : []
      ).reduce((prev, curr, index, array) => ([...prev, ...curr])) as any : []
    ).reduce((prev, curr, index, array) => ([...prev, ...curr])) as any : [];


    const accountAclPermissions = accountWithAclScopes.accountAclScopes.map((scope) => (
      {
        name: scope.scope ? scope.scope.name : "All scopes",
        source: {
          type: "ACL-ACCOUNT",
          acl: {
            uuid: scope.acl.uuid
          },
          account: {
            id: accountWithAclScopes.id,
            uuid: accountWithAclScopes.uuid,
            picture: accountWithAclScopes.avatar,
            username: accountWithAclScopes.username,
          },
        },
        sources: []
      }
    )) as any

    const groupsAclPermissions = accountWithAclScopes.groups.length ? 
      accountWithAclScopes.groups.map(
        (group) => group.groupScopes.length ? group.groupScopes.map(
          (scope) => (
            {
              name: scope.scope ? scope.scope.name : "All scopes",
              source: {
                type: "ACL-GROUP",
                acl: {
                  uuid: scope.acl.uuid
                },
                group: {
                  id: group.id,
                  uuid: group.uuid,
                  name: group.name
                },
              },
              sources: []
            }
    )) : []).reduce((prev, curr, index, array) => ([...prev, ...curr])) as any : []

    const accountDirectPermissions = accountWithAssignedPermissions.assignedPermissions.length ?  accountWithAssignedPermissions.assignedPermissions.map((scope) => (
      {
        name: scope.name,
        source: {
          type: "DIRECT-ACCOUNT",
          account: {
            id: accountWithAssignedPermissions.id,
            uuid: accountWithAssignedPermissions.uuid,
            picture: accountWithAssignedPermissions.avatar,
            username: accountWithAssignedPermissions.username,
          },
        },
        sources: []
      }
    )) as any : []

    function accumulator(result: any[], value, key) {
      console.log('result ', result, 'value ', value);
      
      const findIndex = result.findIndex((o) => o.name === value.name);
      console.log('findIndex ', findIndex);
      console.log('found ', result[findIndex]);
      
      
      if(findIndex > -1) {
        if(result[findIndex].sources) result[findIndex].sources.push(value.source)
      } else {
        const newValue = {
          ...value,
          sources: [value.source]
        };
        delete newValue.source;
        result.push(newValue);
      }
    }

    const permissions = _.transform(
      [
        ...organizatonMemberPermissions,
        ...organizationMemberGroupsPermissions,
        ...accountAclPermissions,
        ...groupsAclPermissions,
        ...accountDirectPermissions
      ], accumulator);

    return permissions;
  }

  public getAccountAclPermissionsByUUID(uuid: string) {
    return this.accountRepository.findOne({
      where: { uuid },
      relations: [
        "accountAclScopes",
        "accountAclScopes.scope",
        "accountAclScopes.acl",
        "groups",
        "groups.groupScopes", 
        "groups.groupScopes.scope",
        "groups.groupScopes.acl"
      ],
    });
  }

  public getAccountPermissionsByUUID(uuid: string) {
    return this.accountRepository.findOne({
      where: { uuid },
      relations: ["assignedPermissions"],
    });
  }

  public getAccountOrganizationsGroupsPermissionsByUUID(uuid: string) {
    return this.accountRepository.findOne({
      where: { uuid },
      relations: ["assignedOrganizationGroups", "assignedOrganizationGroups.scopes"],
    });
  }


  public getAccountByProvider(
    provider: string,
    id: string
  ): Promise<AccountEntity> {
    const ctx = this;
    return new Promise((resolve, reject) => {
      this.accountsProviderRepository
        .findOne(
          { provider, id },
          { relations: ["account", "account.providers", "account.emails"] }
        )
        .then((findedProvider) => {
          resolve(findedProvider ? findedProvider.account : null);
        });
    });
  }
  public getAccountByEmail(email: string): Promise<AccountEntity> {
    const ctx = this;
    return new Promise((resolve, reject) => {
      this.emailRepository.findByPrimaryEmail(email).then((email) => {
        resolve(email ? email.account : null);
      });
    });
  }
  public getAccountByPrimaryEmail(email: string): Promise<AccountEntity> {
    const ctx = this;
    return new Promise((resolve, reject) => {
      this.emailRepository.findByPrimaryEmail(email).then((email) => {
        resolve(email ? email.account : null);
      });
    });
  }
  public getAccountByUsername(username: string): Promise<AccountEntity> {
    const ctx = this;
    return new Promise((resolve, reject) => {
      ctx.accountRepository.findByUsername(username).then((account) => {
        resolve(account);
      });
    });
  }
  public getAccountByUUID(uuid: string): Promise<AccountEntity> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const account = await ctx.accountRepository.findByUUID(uuid);
      resolve(account);
    });
  }

  public getByUUIDWithRelations(
    uuid: string,
    relations: string[]
  ): Promise<AccountEntity> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      //["emails", "clients", "providers", "providers.account"]
      const account = await ctx.accountRepository.findOne(
        { uuid: uuid },
        { relations: relations }
      );
      resolve(account);
    });
  }

  public getAccountsByRole(role: string): Promise<AccountEntity[]> {
    const ctx = this;
    return new Promise((resolve, reject) => {
      ctx.accountRepository.find({ role: role }).then((accounts) => {
        resolve(accounts);
      });
    });
  }

  public getAccountAuthnMethods(uuid: string) {
    return this.accountsAuthnMethodRepository.find({
      account: {
        uuid,
      },
    });
  }

  public getAccountAuthnMethod(uuid: string, method: AuthenticationMethods) {
    return this.accountsAuthnMethodRepository.findOne({
      type: method,
      account: {
        uuid,
      },
    }, {
      relations: ["account"]
    });
  }

  public removeAccountAuthnMethod(method: AccountAuthnMethod) {
    return this.accountsAuthnMethodRepository.delete(method);
  }

  public addAccountAuthnMethod(authn: AccountAuthnMethod) {
    return this.accountsAuthnMethodRepository.save(authn);
  }

  public verifyEmailByCode(code: string): Promise<any> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const decoded = ctx.tokenService.verifyEmailCode(code);
      if (decoded) {
        // @ts-ignore
        const accountUUID = decoded.sub;
        try {
          const verify = await ctx.verifyAccountEmail(accountUUID);
          resolve(verify);
        } catch (error) {
          reject(error);
        }
      } else {
        reject("INVALID_CODE");
      }
    });
  }
  public verifyAccountEmail(uuid: string): Promise<any> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const account = await ctx.getAccountByUUID(uuid);
      if (account && account.isPrimaryEmailVerified()) {
        reject("ACCOUNT_EMAIL_ALREADY_VERIFIED");
      } else {
        const newEmails = account.emails.map((email) => {
          if (email.primary) {
            return {
              ...email,
              email_verified: true,
            };
          } else {
            return email;
          }
        });
        await this.accountRepository.save(account);
        resolve("ACCOUNT_EMAIL_VERIFIED");
      }
    });
  }

  public addProvider(provider: AccountProvider) {
    this.accountsProviderRepository.save(provider);
  }

  public async removeProvider(provider: AccountProvider) {
    try {
      await this.accountsProviderRepository.remove(provider);
    } catch (err) {
      console.log("err", err);
    }
  }

  public addEmail(email: Email) {
    return this.emailRepository.save(email);
  }

  public deleteEmail(emailUuid: string, accountUUID: string) {
    return this.emailRepository.delete({
      uuid: emailUuid,
      account: {
        uuid: accountUUID,
      },
    });
  }

  public saveAccount(account: AccountEntity) {
    return this.accountRepository.save(account);
  }

  public getAccountSessions(account_uuid: string): Promise<AccountSession[]> {
    return this.accountsSessionRepository.find({
      relations: ["account"],
      where: {
        account: { uuid: account_uuid },
      },
    });
  }

  public getBrowserSessions(session_id: string): Promise<AccountSession[]> {
    return this.accountsSessionRepository.find({
      relations: ["account", "account.emails"],
      where: {
        session_id,
      },
    });
  }

  public async getMeSessionsEndpoint(account_uuid: string) {
    const sessions = await this.getAccountSessions(account_uuid);

    return sessions.map((session) => {
      return {
        uuid: session.uuid,
        session_id: session.session_id,
        account_uuid: session.account.uuid,
      };
    });
  }

  public async getBrowserSessionsEndpoint(session_id: string) {
    if (!session_id) return [];
    const sessions = await this.getBrowserSessions(session_id);

    return sessions.map((session) => {
      return {
        uuid: session.uuid,
        session_id: session.session_id,
        account: {
          uuid: session.account.uuid,
          username: session.account.username,
          email: session.account.getPrimaryEmail(),
          picture: session.account.avatar,
          role: session.account.role,
        },
      };
    });
  }

  public addSession(session: AccountSession) {
    return this.accountsSessionRepository.save(session);
  }

  public deleteAccountSession(session_uuid: string, account_uuid: string) {
    console.log(session_uuid);
    console.log(account_uuid);

    return this.accountsSessionRepository.delete({
      uuid: session_uuid,
    });
  }

  public deleteBrowserSession(session_id: string) {
    return this.accountsSessionRepository.delete({ session_id });
  }
}
