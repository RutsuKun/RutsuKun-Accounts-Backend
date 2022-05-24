import { EntityRepository, Repository } from "typeorm";
import { OrganizationGroup } from "@entities/OrganizationGroup";

@EntityRepository(OrganizationGroup)
export class OrganizationGroupRepository extends Repository<OrganizationGroup> {
  findAll(): Promise<OrganizationGroup[] | undefined> {
    return this.find();
  }
}
