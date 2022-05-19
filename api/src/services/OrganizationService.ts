import { Inject, Injectable } from "@tsed/di";
import { UseConnection } from "@tsed/typeorm";
import { LoggerService } from "@services/LoggerService";
import { GroupRepository } from "@repositories/GroupRepository";
import { AccountGroup } from "@entities/AccountGroup";
import { DeleteResult } from "typeorm";
import { OrganizationRepository } from "@repositories/OrganizationRepository";
import { Organization } from "@entities/Organization";

@Injectable()
export class OrganizationService {
  @Inject()
  @UseConnection("default")
  private organizationRepository: OrganizationRepository;

  constructor() {}

  public getOrganizations() {
    return this.organizationRepository.findAll();
  }

  public getOrganizationByUUID(uuid: string) {
    return this.organizationRepository.findOne({ uuid });
  }

  public getOrganizationAppsByUUID(uuid: string) {
    return this.organizationRepository.findOne({ uuid }, { relations: ["clients", "clients.account"] });
  }

  public getOrganizationMembersByUUID(uuid: string) {
    return this.organizationRepository.findOne({ uuid }, { relations: ["members", "members.account"] });
  }

}