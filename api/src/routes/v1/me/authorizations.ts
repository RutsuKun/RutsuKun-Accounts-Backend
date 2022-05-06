import { Controller } from "@tsed/di";
import { Delete, Get, Post } from "@tsed/schema";
import { AccountsService } from "@services/AccountsService";
import { Context, PathParams, Req, Res, UseBefore } from "@tsed/common";
import {
    SessionLoggedMiddleware,
    SessionMiddleware,
} from "@middlewares/session.middleware";
import { SessionService } from "@services/SessionService";
import { HTTP, HTTPCodes, Validate } from "@utils";
import { OAuth2Service } from "@services/OAuth2Service";

@Controller("/me/authorizations")
export class MeRoute {
    constructor(
        private accountsService: AccountsService,
        private oauthService: OAuth2Service
    ) { }

    @Get("/")
    @UseBefore(SessionLoggedMiddleware)
    @UseBefore(SessionMiddleware)
    public async getMe(
        @Req() request: Req,
        @Res() response: Res,
        @Context("session") session: SessionService
    ) {
        const currentAccountWithAuthorizations = await this.oauthService.getAuthorizationsByAccountUUID(session.getCurrentSessionAccount.uuid);

        return response.status(HTTPCodes.OK).json(currentAccountWithAuthorizations.map((authz)=> {
            return {
                id: authz.id,
                uuid: authz.uuid,
                client_logo: authz.client.logo,
                client_id: authz.client.client_id,
                client_name: authz.client.name,
                scopes: authz.scopes.map((scope) => scope.name)
            }
        }));

    }

    @Delete("/:uuid")
    @UseBefore(SessionLoggedMiddleware)
    @UseBefore(SessionMiddleware)
    public async deleteMeEmails(
        @Req() request: Req,
        @Res() response: Res,
        @Context("session") session: SessionService,
        @PathParams("uuid") uuid: string,
    ) {
        const currentAuthz = await this.oauthService.getAuthorizationByUUID(uuid);

        if(!currentAuthz) return response.status(HTTPCodes.NotFound).json();
        if(currentAuthz.account.uuid !== session.getCurrentSessionAccount.uuid) return HTTP.Forbidden(uuid, request, response);
        const { affected } = await this.oauthService.deleteAuthorization(currentAuthz);
        return response.status(HTTPCodes.OK).json({ success: !!affected })
    }
}
