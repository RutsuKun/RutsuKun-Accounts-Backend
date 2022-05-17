import {
  Column,
  Entity,
  Generated,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from "typeorm";
import { ClientEntity } from "./Client";

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

  @PrimaryColumn()
  @Generated("uuid")
  uuid?: string;

  @OneToOne(() => ClientEntity, (client) => client.acl, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({
    name: "client_id",
    referencedColumnName: "client_id",
  })
  client?: ClientEntity;

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
    nullable: false
  })
  description: string;

  @Column({
    type: "varchar",
    nullable: false
  })
  domain: string;
}
