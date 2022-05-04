import { Inject, Injectable } from "@tsed/di";
import { UseConnection } from "@tsed/typeorm";

import { ClientRepository } from "@repositories/ClientRepository";

import { ClientEntity } from "@entities/Client";
import { LoggerService } from "@services/LoggerService";
import { AccountsService } from "@services/AccountsService";

import crypto from "crypto";
import { ScopeService } from "./ScopeService";

@Injectable()
export class ClientService {
  private running: boolean;
  private logger: LoggerService;

  @Inject()
  @UseConnection("default")
  private clientRepository: ClientRepository;

  constructor(
    private loggerService: LoggerService,
    private accountsService: AccountsService,
    private scopeService: ScopeService
  ) {
    this.logger = this.loggerService.child({
      label: {
        type: "client",
        name: "Client Manager",
      },
    });
  }

  public healthy() {
    const ctx = this;
    ctx.logger.info("Requested Client Component Healthy Check");
    const healthy = {
      name: "Client",
      slug: "client",
      healthy: ctx.running,
    };
    return healthy;
  }

  public getClients() {
    return this.clientRepository.find();
  }

  getAccountClients(accountUUID: string) {
    return this.clientRepository.find({
      where: {
        account: {
          uuid: accountUUID,
        },
      },
      relations: ["acl", "account"]
    });
  }

  getAdminClients(relations: string[]) {
    return this.clientRepository.find({
      relations: relations
    });
  }

  public addClient(
    accountUUID: string,
    client: ClientEntity
  ): Promise<ClientEntity> {
    const ctx = this;
    const clientTypes = {
      // web server application
      wsa: {
        confidential: true,
        grantTypes: ["authorization_code", "client_credentials"],
        responseTypes: ["code", "id_token"],
        secret: true,
      },
      // single page applicaton
      spa: {
        confidential: false,
        grantTypes: ["authorization_code"],
        responseTypes: ["code", "token", "id_token"],
        secret: false,
      },
      // native application (ex. pwa)
      native: {
        confidential: false,
        grantTypes: ["authorization_code"],
        responseTypes: ["code", "token", "id_token"],
        secret: false,
      },
      // mobile application (ex. java, kotlin)
      mobile: {
        confidential: false,
        grantTypes: ["authorization_code"],
        responseTypes: ["code", "token", "id_token"],
        secret: false,
      },
    };
    return new Promise(async (resolve, reject) => {
      const {
        name,
        description,
        type,
        // confidential,
        third_party = true,
        redirect_uris,
        privacy_policy,
        tos,
        website,
      } = client;
      let consent;
      let clientId;
      let clientSecret;
      let grantTypes;
      let responseTypes;

      if (!name) {
        return reject("CLIENT_NAME_EMPTY");
      }
      if (!type) {
        return reject("CLIENT_TYPE_EMPTY");
      }
      if (!clientTypes[type]) {
        return reject("CLIENT_TYPE_NOT_SUPPORTED");
      }

      if (redirect_uris.length < 1) {
        return reject("CLIENT_REDIRECT_URIS_EMPTY");
      }

      if (third_party) {
        clientId = await crypto.randomBytes(18).toString("hex");
        consent = true;
      } else {
        clientId = name.toLowerCase().split(" ").join("-");
        consent = false;
      }

      if (clientTypes[type].confidential) {
        clientSecret = await crypto.randomBytes(18).toString("hex");
      }

      grantTypes = clientTypes[type].grantTypes;
      responseTypes = clientTypes[type].responseTypes;

      const clientById = await this.clientRepository.findByClientID(clientId);
      if (!clientById) {
        const accountToSave = await this.accountsService.getAccountByUUID(
          accountUUID
        );

          try {
            const clientToSave = new ClientEntity({
              client_id: clientId,
              secret: clientSecret,
              name: name,
              description: description,
              grant_types: grantTypes,
              redirect_uris: redirect_uris,
              response_types: responseTypes,
              privacy_policy: privacy_policy,
              tos: tos,
              website: website,
              consent: consent,
              state: "ENABLED",
              type: type,
              account: accountToSave
            });
    
            const defaultScopes = await this.scopeService.getDefaultScopes()

            clientToSave.addAcl(defaultScopes);
    
            const savedClient = await this.clientRepository.save(clientToSave);
    
            resolve(savedClient);
          } catch(error) {
            console.log(error);
            
          }
        

      } else {
        ctx.logger.error(
          "Client with client_id '" + clientId + "' already exist",
          null,
          true
        );
        reject("CLIENT_WITH_CLIENT_ID_EXIST");
      }
    });
  }

  public addAdminClient(
    accountUUID: string,
    client: ClientEntity
  ): Promise<ClientEntity> {
    const ctx = this;

    return new Promise(async (resolve, reject) => {
      const { name, description, type, response_types, grant_types, consent, third_party = true, redirect_uris, privacy_policy, verified, tos, website } = client;
      let clientId;
      let clientSecret;

      if (!name) {
        return reject("CLIENT_NAME_EMPTY");
      }

      if (!response_types.length) {
        return reject("CLIENT_RESPONSE_TYPES_EMPTY");
      }

      if (!grant_types.length) {
        return reject("CLIENT_GRANT_TYPES_EMPTY");
      }

      if (redirect_uris.length < 1) {
        return reject("CLIENT_REDIRECT_URIS_EMPTY");
      }

      if (third_party) {
        clientId = await crypto.randomBytes(18).toString("hex");
      } else {
        clientId = name.toLowerCase().split(" ").join("-");
      }

      if (response_types.includes('code')) {
        clientSecret = await crypto.randomBytes(18).toString("hex");
      }

      const clientById = await this.clientRepository.findByClientID(clientId);

      if (!clientById) {
        const accountToSave = await this.accountsService.getAccountByUUID(
          accountUUID
        );

        const defaultScopes = await this.scopeService.getDefaultScopes();
        
        const clientToSave = new ClientEntity({
          client_id: clientId,
          secret: clientSecret,
          name: name,
          description: description,
          grant_types: grant_types,
          redirect_uris: redirect_uris,
          response_types: response_types,
          privacy_policy: privacy_policy,
          tos: tos,
          website: website,
          consent: consent,
          state: "ENABLED",
          type: type,
          verified,
          third_party,
          account: accountToSave
        });
    
        clientToSave.addAcl(defaultScopes);
    
        const savedClient = await this.clientRepository.save(clientToSave);
    
        resolve(savedClient);
            
      } else {
        ctx.logger.error(
          "Client with client_id '" + clientId + "' already exist",
          null,
          true
        );
        reject("CLIENT_WITH_CLIENT_ID_EXIST");
      }
    });
  }

  public async updateClient(
    currentClient: ClientEntity,
    newClient: ClientEntity
  ) {
    const clientTypes = {
      // web server application
      wsa: {
        confidential: true,
        grantTypes: ["authorization_code", "client_credentials"],
        responseTypes: ["code", "id_token"],
        secret: true,
      },
      // single page applicaton
      spa: {
        confidential: false,
        grantTypes: ["authorization_code"],
        responseTypes: ["code", "token", "id_token"],
        secret: false,
      },
      // native application (ex. pwa)
      native: {
        confidential: false,
        grantTypes: ["authorization_code"],
        responseTypes: ["code", "token", "id_token"],
        secret: false,
      },
      // mobile application (ex. java, kotlin)
      mobile: {
        confidential: false,
        grantTypes: ["authorization_code"],
        responseTypes: ["code", "token", "id_token"],
        secret: false,
      },
    };

    const { name, description, type, third_party = true, redirect_uris, privacy_policy, tos, website } = newClient;


    let clientId;
    let clientSecret;
    let grantTypes;
    let responseTypes;

    if (!name) {
      throw new Error("CLIENT_NAME_EMPTY");
    }
    if (!type) {
      throw new Error("CLIENT_TYPE_EMPTY");
    }
    if (!clientTypes[type]) {
      throw new Error("CLIENT_TYPE_NOT_SUPPORTED");
    }
    if (redirect_uris.length < 1) {
      throw new Error("CLIENT_REDIRECT_URIS_EMPTY");
    }
    if (clientTypes[type].confidential && !currentClient.secret) {
      clientSecret = await crypto.randomBytes(18).toString("hex");
    } else if(clientTypes[type].confidential && currentClient.secret) {
      clientSecret = currentClient.secret;
    } else {
      clientSecret = null;
    }
    
    grantTypes = clientTypes[type].grantTypes;
    responseTypes = clientTypes[type].responseTypes;

        try {
          const clientToSave = new ClientEntity({
            ...currentClient,
            secret: clientSecret,
            name: name,
            description: description,
            grant_types: grantTypes,
            redirect_uris: redirect_uris,
            response_types: responseTypes,
            privacy_policy: privacy_policy,
            tos: tos,
            website: website,
            type: type,
          });
  
          const savedClient = await this.clientRepository.save(clientToSave);
  
          return savedClient;
        } catch(error) {
          console.log(error);
          
        }
      



  }

  public deleteClient(clientId) {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      const deleted = await this.clientRepository.delete({
        client_id: clientId,
      });
      if (deleted.affected) {
        resolve("Client deleted");
      } else {
        reject("Client doesn't exist or already deleted");
      }
    });
  }

  public checkClient(client: ClientData): Promise<any> {
    const ctx = this;
    const { client_id, redirect_uri, grant_type } = client;
    return new Promise(async (resolve, reject) => {
      if (!client_id) {
        ctx.logger.error(
          "Invalid Client: " + JSON.stringify(client),
          null,
          true
        );
        reject("CLIENT_INVALID");
      } else {
        const checked = await this.clientRepository.findByClientID(client_id);

        if (checked) {
          if (
            checked.redirect_uris.includes(redirect_uri) ||
            grant_type === "client_credentials"
          ) {
            resolve(checked);
          } else {
            ctx.logger.error(
              "Invalid Client redirect uri: " + JSON.stringify(client),
              null,
              true
            );
            reject("Invalid request");
          }
        } else {
          ctx.logger.error(
            "Invalid Client: " + JSON.stringify(client),
            null,
            true
          );
          reject("Invalid request");
        }
      }
    });
  }

  public getClientByClientId(client_id): Promise<ClientEntity> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      if (!client_id) {
        ctx.logger.error("Invalid Client: " + client_id, null, true);
        reject("invalid_client");
      } else {
        const checked = await ctx.clientRepository.findByClientID(client_id);

        if (checked) {
          resolve(checked);
        } else {
          ctx.logger.error(
            "Invalid Client: " + JSON.stringify(client_id),
            null,
            true
          );
          reject({
            error: "invalid_client",
            error_description: "Provided client is invalid.",
          });
        }
      }
    });
  }

  public checkClientRedirectUri(client: ClientData, redirectUri): Promise<boolean> {
    const ctx = this;
    const { redirect_uris } = client;
    return new Promise((resolve) => {
      if (!redirect_uris.includes(redirectUri)) {
        ctx.logger.error(
          "Invalid Client Redirect URI: " + redirectUri,
          null,
          true
        );
        resolve(false);
      } else {
        resolve(true);
      }
    });
  }

  public checkClientSecret(client: ClientData, clientSecret): Promise<boolean> {
    const ctx = this;
    // @ts-ignore
    const { secret } = client;
    return new Promise((resolve) => {
      if (secret !== clientSecret) {
        ctx.logger.error("Invalid Client " + client.client_id + " Secret: " + clientSecret, null, true);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  }

  public getClientConfiguration(client_id: string): Promise<any> {
    const ctx = this;
    return new Promise(async (resolve, reject) => {
      if (!client_id) {
        reject("CLIENT_EMPTY");
      } else {
        const client = await ctx.clientRepository.findByClientID(client_id);
        if (client) {
          const configuration = {
            registrationEnabled: true,
            loginEnabled: true,
            client_id: client.client_id,
            name: client.name,
            verified: client.verified,
            grant_types: client.grant_types,
            redirect_uris: client.redirect_uris,
            response_types: client.response_types,
            logo: client.logo,
            policy_uri: client.privacy_policy,
            tos_uri: client.tos,
            consent: client.consent,
            state: client.state,
            type: client.type,
            methods: [],
          };
          // if (client.providers) {
          //   client.providers.forEach((provider, index) => {
          //     configuration.methods.push({
          //       method: provider.name,
          //       enabled: provider.enabled,
          //       scopes: [],
          //     });
          //   });
          // }
          resolve(configuration);
        } else {
          ctx.logger.error(
            "Invalid Client: " + JSON.stringify(client_id),
            null,
            true
          );
          reject("CLIENT_INVALID");
        }
      }
    });
  }
}

export interface ClientData {
  client_id?: string;
  redirect_uri?: string;
  redirect_uris?: Array<string>;
  client_secret?: string;
  grant_type?: string;
}
