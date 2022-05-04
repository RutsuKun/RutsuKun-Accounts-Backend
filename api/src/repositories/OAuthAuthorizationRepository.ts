import { EntityRepository, Repository } from "typeorm";
import { OAuthAuthorization } from "@entities/OAuthAuthorization";

@EntityRepository(OAuthAuthorization)
export class OAuthAuthorizationRepository extends Repository<OAuthAuthorization> {
  findAll(): Promise<OAuthAuthorization[] | undefined> {
    return this.find({
      relations: ["account", "client", "scopes"],
    });
  }
}
