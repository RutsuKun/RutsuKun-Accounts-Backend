import { Controller, Delete, Get, Inject, PathParams, Post, QueryParams, Req, Res, UseBefore } from "@tsed/common";

// MIDDLEWARES

import { SessionMiddleware } from "@middlewares/session.middleware";
import { AccessTokenMiddleware } from "@middlewares/security";
import { CheckTokenRevokedMiddleware } from "@middlewares/token.middleware";

// SERVICES

import { LoggerService } from "@services/LoggerService";
import { SessionService } from "@services/SessionService";
import { ClientService } from "@services/ClientService";

import { HTTPCodes } from "@utils";
import { ScopeMiddleware } from "@middlewares/scope.middleware";


@Controller("/admin/clients")
export class AdminClientsRoute {
  constructor(
    @Inject() private sessionService: SessionService,
    @Inject() private clientService: ClientService,
    @Inject() private loggerService: LoggerService
  ) {}

  @Get("/")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:clients:manage"]))
  public async getAdminClients(
    @Req() request: Req,
    @Res() response: Res
  ) {
    const clients = await this.clientService.getAdminClients(["account", "organization"]);

    const filtered = clients.map((client)=>{
        return {
            ...client,
            account: client.account ? {
                id: client.account.id,
                uuid: client.account.uuid,
                username: client.account.username,
                avatar: client.account.avatar
            } : null,
            organization: client.organization ? {
                id: client.organization.id,
                uuid: client.organization.uuid,
                name: client.organization.name,
                logo: client.organization.logo
            } : null
        }
    })

    response.status(HTTPCodes.OK).json(filtered);
  }

  @Post("/")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:clients:manage"]))
  public async postClients(
    @Req() request: Req,
    @Res() response: Res
  ) {
    const data = request.body;
    try {
      const client = await this.clientService.addAdminClient(response.user.sub, data);
      response.status(HTTPCodes.Created).json(client);
    } catch (err) {
      console.log('err', err);
      
      response.status(HTTPCodes.BadRequest).json({
        error: err,
      });
    }
  }

  @Get("/:clientId")
  @UseBefore(AccessTokenMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:clients:manage"]))
  public async getAdminClient(
    @Req() request: Req,
    @Res() response: Res,
    @PathParams("clientId") client_id: string
  ) {

    try {
      const client = await this.clientService.getAdminClient(client_id, ["account", "organization"]);
      response.status(HTTPCodes.OK).json({
        ...client,
        account: client.account ? {
            id: client.account.id,
            uuid: client.account.uuid,
            username: client.account.username,
            avatar: client.account.avatar
        } : null,
        organization: client.organization ? {
            id: client.organization.id,
            uuid: client.organization.uuid,
            name: client.organization.name,
            logo: client.organization.logo
        } : null
      });
    } catch (error) {
      response.status(HTTPCodes.BadRequest).json(error);
    }

  }

  @Delete("/:clientId")
  @UseBefore(SessionMiddleware)
  @UseBefore(CheckTokenRevokedMiddleware)
  @UseBefore(new ScopeMiddleware().use(["admin:access", "admin:clients:manage", "admin:clients:delete"]))
  public deleteClients(@Req() request: Req, @Res() response: Res) {
    const currentAccount = this.sessionService.getCurrentSessionAccount;

    const clientId = request.params.clientId;

    this.clientService
      .getClientByClientId(clientId)
      .then((client) => {
        if (currentAccount.uuid === client.account.uuid) {
          this.clientService
            .deleteClient(clientId)
            .then(() => {
              response.status(HTTPCodes.OK).send();
            })
            .catch((error) => {
              response.status(HTTPCodes.BadRequest).json({
                error: error,
              });
            });
        } else {
          response.status(HTTPCodes.BadRequest).json({
            error: "Can you only delete your own application",
          });
        }
      })
      .catch((error) => {
        response.status(HTTPCodes.BadRequest).json({
          error: error,
        });
      });
  }

  @Get("/:clientId/public")
  public async getClientsPublic(
    @Req() request: Req,
    @Res() response: Res,
    @PathParams("clientId") clientId: string
  ) {
    try {
      const client = await this.clientService.getClientByClientId(clientId);
      response.status(HTTPCodes.OK).json({
        client_id: client.client_id,
        name: client.name,
        logo: client.logo,
        privacy_policy: client.privacy_policy,
        tos: client.tos,
        verified: client.verified,
        third_party: client.third_party,
        owner: {
          username: client.account.username,
          avatar: client.account.avatar,
        },
      });
    } catch (error) {
      response.status(HTTPCodes.BadRequest).json(error);
    }
  }
}
