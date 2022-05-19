import { Organization } from "@entities/Organization";
import {
    Column,
    Entity,
    Generated,
    JoinColumn,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
  } from "typeorm";
  import { AccountEntity } from "./Account";
  
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
  
    @ManyToMany(() => AccountEntity, (account) => account.groups)
    accounts?: AccountEntity[];

    @ManyToOne(() => Organization, (org) => org.members, { onDelete: "CASCADE" })
    @JoinColumn({ name: "organization_id", referencedColumnName: "id" })
    organization?: Organization;

    @ManyToOne(() => AccountEntity, (account) => account.organizations, { onDelete: "CASCADE" })
    @JoinColumn({ name: "account_id", referencedColumnName: "id" })
    account?: AccountEntity;
  
  }
  