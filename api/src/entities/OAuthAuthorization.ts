import {
    Column,
    Entity,
    Generated,
    JoinColumn,
    JoinTable,
    ManyToMany,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
  } from "typeorm";
import { AccountEntity } from "./Account";
import { ClientEntity } from "./Client";
import { OAuthScope } from "./OAuthScope";
  
@Entity({
  name: "oauth_accounts_authorizations",
  engine: "InnoDB",
})
export class OAuthAuthorization {
  constructor(authz: OAuthAuthorization) {
    Object.assign(this, authz);
  }

  @PrimaryGeneratedColumn()
  id?: number;

  @Generated("uuid")
  @Column()
  uuid?: string;

  @ManyToOne(() => AccountEntity, (account) => account.authorizations)
  @JoinColumn({ name: "account_id", referencedColumnName: "id" })
  account?: AccountEntity;

  @ManyToOne(() => ClientEntity, (client) => client.authorizations)
  @JoinColumn({ name: "client_id", referencedColumnName: "client_id" })
  client?: ClientEntity;

  @ManyToMany(() => OAuthScope, (scope) => scope.authorizations, { cascade: true })
  @JoinTable({
    name: "oauth_accounts_authorizations_scopes",
    joinColumn: {
      name: "authorization_id",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "scope_id",
      referencedColumnName: "id",
    },
  })
  scopes?: OAuthScope[];

}
  