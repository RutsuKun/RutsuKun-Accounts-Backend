import { Inject, Injectable } from "@tsed/di";
import { UseConnection } from "@tsed/typeorm";
import { LoggerService } from "@services/LoggerService";
import { GroupRepository } from "@repositories/GroupRepository";
import { AccountGroup } from "@entities/AccountGroup";
import { DeleteResult } from "typeorm";
import { OrganizationRepository } from "@repositories/OrganizationRepository";

@Injectable()
export class OrganizationService {
  @Inject()
  @UseConnection("default")
  private organizationRepository: OrganizationRepository;

  constructor() {}

  public getOrganizations() {
    return this.organizationRepository.findAll();
  }

}