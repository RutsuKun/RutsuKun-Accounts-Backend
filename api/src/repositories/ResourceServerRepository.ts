import { EntityRepository, Repository } from "typeorm";
import { ResourceServer } from "@entities/ResourceServer";

@EntityRepository(ResourceServer)
export class ResourceServerRepository extends Repository<ResourceServer> {
  findAll(): Promise<ResourceServer[] | undefined> {
    return this.find({
      relations: ["scopes"],
    });
  }
}
