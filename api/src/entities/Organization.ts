import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ClientEntity } from "./Client";
import { OrganizationGroup } from "./OrganizationGroup";
import { OrganizationMember } from "./OrganizationMember";

@Entity({
  name: "organizations",
  engine: "InnoDB",
})
export class Organization {
  constructor(org?: Organization) {
    if(org) {
      Object.assign(this, org);
    }
  }

  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  @Generated("uuid")
  uuid?: string;

  @OneToMany(() => ClientEntity, (client) => client.organization, { cascade: true })
  clients?: ClientEntity[];

  @Column({
    type: "varchar",
    nullable: false,
    default: "/assets/images/avatars/default-avatar.png"
  })
  logo: string;

  @Column({
    type: "varchar",
    nullable: false
  })
  name: string;

  @Column({
    type: "varchar",
    nullable: true
  })
  description: string;

  @Column({
    type: "varchar",
    nullable: true
  })
  domain: string;

  @OneToMany(() => OrganizationMember, (member) => member.organization, {
    cascade: true,
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  members?: OrganizationMember[];

  @OneToMany(() => OrganizationGroup, (group) => group.organization, {
    cascade: true,
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  groups?: OrganizationGroup[];
}
