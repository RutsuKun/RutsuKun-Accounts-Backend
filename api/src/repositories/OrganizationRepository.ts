import { EntityRepository, Repository } from "typeorm";
import { Organization } from "@entities/Organization";

@EntityRepository(Organization)
export class OrganizationRepository extends Repository<Organization> {
  findAll(): Promise<Organization[] | undefined> {
    return this.find();
  }
}
