import { EntityRepository, Repository } from "typeorm";
import { OrganizationMember } from "@entities/OrganizationMember";

@EntityRepository(OrganizationMember)
export class OrganizationMemberRepository extends Repository<OrganizationMember> {
  findAll(): Promise<OrganizationMember[] | undefined> {
    return this.find();
  }
}
