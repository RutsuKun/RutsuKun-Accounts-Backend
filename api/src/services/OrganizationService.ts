import { Inject, Injectable } from "@tsed/di";
import { UseConnection } from "@tsed/typeorm";
import { OrganizationRepository } from "@repositories/OrganizationRepository";
import { OrganizationMemberRepository } from "@repositories/OrganizationMemberRepository";
import _ from "lodash";
import { OrganizationGroupRepository } from "@repositories/OrganizationGroupRepository";

@Injectable()
export class OrganizationService {
  @Inject()
  @UseConnection("default")
  private organizationRepository: OrganizationRepository;

  @Inject()
  @UseConnection("default")
  private organizationMemberRepository: OrganizationMemberRepository;

  @Inject()
  @UseConnection("default")
  private organizationGroupRepository: OrganizationGroupRepository;

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

  public async getOrganizationMembersByUUID(uuid: string) {
    const query = await this.organizationRepository.findOne(
      { uuid },
      { 
        relations: [
          "members", 
          "members.scopes", 
          "members.organization", 
          "members.account", 
          "members.account.emails", 
          "members.account.accountAclScopes", 
          "members.account.accountAclScopes.scope", 
          "members.account.accountAclScopes.acl", 
          "members.account.groups", 
          "members.account.groups.groupScopes", 
          "members.account.groups.groupScopes.scope",
          "members.account.groups.groupScopes.acl",
        ]
      });

    function accumulator(result: any[], value, key) {
      console.log('result ', result, 'value ', value);
      
      const findIndex = result.findIndex((o) => o.name === value.name);
      console.log('findIndex ', findIndex);
      console.log('found ', result[findIndex]);
      
      
      if(findIndex > -1) {
        if(result[findIndex].sources) result[findIndex].sources.push(value.source)
      } else {
        const newValue = {
          ...value,
          sources: [value.source]
        };
        delete newValue.source;
        result.push(newValue);
      }
    }

    const members = query.members.map((member) => ({
      id: member.id,
      uuid: member.uuid,
      organization_id: member.organization.id,
      organization_uuid: member.organization.uuid,
      account_id: member.account.id,
      account_uuid: member.account.uuid,
      account_username: member.account.username,
      account_email: member.account.getPrimaryEmail(),
      account_picture: member.account.avatar,
      account_permissions: _.transform([
        ...member.account.accountAclScopes.map((scope) => (
          {
            name: scope.scope.name,
            source: {
              type: "ACL-ACCOUNT",
              acl: {
                uuid: scope.acl.uuid
              },
              account: {
                id: member.account.id,
                uuid: member.account.uuid,
                picture: member.account.avatar,
                username: member.account.username 
              },
            },
            sources: []
          }
        )),
        ...member.account.groups.length ? member.account.groups.map((group) => group.groupScopes.map((scope) => (
          {
            name: scope.scope ? scope.scope.name : null,
            source: { 
              type: "ACL-GROUP",
              acl: {
                uuid: scope.acl.uuid
              },
              group: {
                id: group.id,
                uuid: group.uuid,
                name: group.name
              },
            },
            sources: []
          }
        ))).reduce((prev, curr, index, array) => ([...curr])) : [],
        ...member.scopes.map((scope) => (
          {
            name: scope.name,
            source: {
              type: "ORGANIZATION-MEMBER",
              organization: {
                id: member.organization.id,
                uuid: member.organization.uuid,
                name: member.organization.name
              },
              member: {
                id: member.account.id,
                uuid: member.account.uuid,
                picture: member.account.avatar,
                username: member.account.username 
              }
            }, 
            sources: []
          }
        )),
      ], accumulator)
    }))

    return { members }
  }

  public getOrganizationGroupsByUUID(uuid: string) {
    return this.organizationRepository.findOne({ uuid }, { relations: ["groups", "groups.group"] });
  }

  public getOrganizationsMemberWithPermissions(accountUUID: string) {
    return this.organizationMemberRepository.find({
      where: {
        account: {
          uuid: accountUUID
        },
      },
      relations: ["account", "scopes", "organization"],
    })
  }

}