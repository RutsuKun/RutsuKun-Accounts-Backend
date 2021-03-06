import {
  Column,
  Entity,
  Generated,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AccountEntity } from "./Account";
import { CrossAclGroupScopeEntity } from "./CrossAclGroupScope";

@Entity({
  name: "oauth_groups",
  engine: "InnoDB",
})
export class AccountGroup {
  constructor(group: AccountGroup) {
    Object.assign(this, group);
  }

  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  @Generated("uuid")
  uuid?: string;

  @Column({ type: "varchar", unique: true })
  name: string;

  @Column({ type: "varchar", unique: true })
  display_name: string;

  @Column({ type: "boolean" })
  enabled: boolean;

  @ManyToMany(() => AccountEntity, (account) => account.groups)
  accounts?: AccountEntity[];

  @OneToMany(
    (type: any) => CrossAclGroupScopeEntity,
    (groupScopes: CrossAclGroupScopeEntity) => groupScopes.group
  )
  groupScopes?: CrossAclGroupScopeEntity[];
}
