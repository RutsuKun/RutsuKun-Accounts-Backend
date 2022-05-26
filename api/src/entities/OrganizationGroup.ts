import { Organization } from "@entities/Organization";
import {
    Column,
    Entity,
    Generated,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
  } from "typeorm";
  import { AccountEntity } from "./Account";
import { AccountGroup } from "./AccountGroup";
import { OAuthScope } from "./OAuthScope";
import { OrganizationMember } from "./OrganizationMember";
  
  @Entity({
    name: "organizations_groups",
    engine: "InnoDB",
  })
  export class OrganizationGroup {
    constructor(group: OrganizationGroup) {
      Object.assign(this, group);
    }
  
    @PrimaryGeneratedColumn()
    id?: number;
  
    @Column()
    @Generated("uuid")
    uuid?: string;
  
    @ManyToOne(() => Organization, (organization) => organization.groups, { onDelete: "CASCADE" })
    @JoinColumn({ name: "organization_id", referencedColumnName: "id" })
    organization?: Organization;

    @ManyToMany(() => OrganizationMember, (member) => member.assignedGroups, { onDelete: "CASCADE" })
    members?: OrganizationMember;

    @ManyToOne(() => AccountGroup, (group) => group.assignedOrganizationGroups, { onDelete: "CASCADE" })
    @JoinColumn({ name: "group_id", referencedColumnName: "id" })
    assignedGroup?: AccountGroup;

    @ManyToMany(() => OAuthScope, (scope) => scope.scopesOrganizationMembers)
    @JoinTable({
      name: "organizations_groups_scopes",
      joinColumn: {
        name: "group_id",
        referencedColumnName: "id",
      },
      inverseJoinColumn: {
        name: "scope_id",
        referencedColumnName: "id",
      },
    })
    scopes?: OAuthScope[];
  
  }
  