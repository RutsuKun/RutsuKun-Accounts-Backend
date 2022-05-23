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
import { OAuthScope } from "./OAuthScope";
  
  @Entity({
    name: "organizations_members",
    engine: "InnoDB",
  })
  export class OrganizationMember {
    constructor(member: OrganizationMember) {
      Object.assign(this, member);
    }
  
    @PrimaryGeneratedColumn()
    id?: number;
  
    @Column()
    @Generated("uuid")
    uuid?: string;
  
    @ManyToOne(() => Organization, (org) => org.members, { onDelete: "CASCADE" })
    @JoinColumn({ name: "organization_id", referencedColumnName: "id" })
    organization?: Organization;

    @ManyToOne(() => AccountEntity, (account) => account.organizations, { onDelete: "CASCADE" })
    @JoinColumn({ name: "account_id", referencedColumnName: "id" })
    account?: AccountEntity;

    @ManyToMany(() => OAuthScope, (scope) => scope.scopesOrganizationMembers)
    @JoinTable({
      name: "organizations_members_scopes",
      joinColumn: {
        name: "member_id",
        referencedColumnName: "id",
      },
      inverseJoinColumn: {
        name: "scope_id",
        referencedColumnName: "id",
      },
    })
    scopes?: OAuthScope[];
  
  }
  