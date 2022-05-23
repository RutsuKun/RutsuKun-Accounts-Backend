import { Inject, Injectable } from "@tsed/di";
import { UseConnection } from "@tsed/typeorm";
import { OrganizationRepository } from "@repositories/OrganizationRepository";
import { OrganizationMemberRepository } from "@repositories/OrganizationMemberRepository";

@Injectable()
export class OrganizationService {
  @Inject()
  @UseConnection("default")
  private organizationRepository: OrganizationRepository;

  @Inject()
  @UseConnection("default")
  private organizationMemberRepository: OrganizationMemberRepository;

  constructor() {}

  public getOrganizations() {
    return this.organizationRepository.findAll();
  }

  public getOrganizationByUUID(uuid: string) {
    return this.organizationRepository.findOne({ uuid });
  }

  public getOrganizationDetailsByUUID(uuid: string) {
    return this.organizationRepository.findOne({ uuid }, { relations: ["clients", "members", "members.account", "members.scopes", "groups", "groups.group", "groups.scopes"] });
  }

  public getOrganizationAppsByUUID(uuid: string) {
    return this.organizationRepository.findOne({ uuid }, { relations: ["clients", "clients.account"] });
  }

  public getOrganizationMembersByUUID(uuid: string) {
    return this.organizationRepository.findOne({ uuid }, { relations: ["members", "members.account"] });
  }

  public getOrganizationGroupsByUUID(uuid: string) {
    return this.organizationRepository.findOne({ uuid }, { relations: ["groups", "groups.group"] });
  }

  public getOrganizationMemberScopesByUUID(uuid: string) {
    return this.organizationMemberRepository.findOne({
      account: {
        uuid
      }
    }, { relations: ["account", "scopes", "organization"], })
  }

}