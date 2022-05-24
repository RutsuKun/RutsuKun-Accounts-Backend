import { Inject, Injectable } from "@tsed/di";
import { UseConnection } from "@tsed/typeorm";
import { ResourceServerRepository } from "@repositories/ResourceServerRepository";



@Injectable()
export class ResourceServerService {

  @Inject()
  @UseConnection("default")
  private resourceServerRepository: ResourceServerRepository;

  constructor() {}

  public getResourceServers() {
    return this.resourceServerRepository.findAll();
  }

}