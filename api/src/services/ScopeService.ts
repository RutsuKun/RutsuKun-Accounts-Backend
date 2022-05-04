import { Inject, Injectable } from "@tsed/di";
import { UseConnection } from "@tsed/typeorm";
import { OAuthScopeRepository } from "@repositories/OAuthScopeRepository";
import { OAuthScope } from "@entities/OAuthScope";
import { DeleteResult } from "typeorm";

@Injectable()
export class ScopeService {
  @Inject()
  @UseConnection("default")
  private oauthScopeRepository: OAuthScopeRepository;
  constructor() {}

  public getScopes() {
    return this.oauthScopeRepository.findAll();
  }

  public getDefaultScopes() {
    return this.oauthScopeRepository.findDefaultScopes();
  }

  public createScope(scope: OAuthScope): Promise<OAuthScope> {
    return this.oauthScopeRepository.save(scope);
  }

  public deleteScope(scope: string): Promise<DeleteResult> {
    return this.oauthScopeRepository.delete({ name: scope });
  }

  async getScopesEntities(scopes: string[]) {


    const foundScopes = await this.oauthScopeRepository.find({ 
      where: scopes.map((scope) => ({ name: scope }) )
    });

    return foundScopes;
  }
}
