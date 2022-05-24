import {
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AccountEntity } from "./Account";
import { OAuthClientACL } from "./OAuthClientACL";
import { OAuthScope } from "./OAuthScope";

@Entity({
  name: "oauth_clients_acls_accounts_scopes",
  engine: "InnoDB",
})
export class CrossAclAccountScopeEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @ManyToOne(() => AccountEntity, (account: AccountEntity) => account.accountAclScopes, { nullable: false })
  account: AccountEntity;

  @ManyToOne(() => OAuthScope, (scope: OAuthScope) => scope.id, { cascade: true })
  scope: OAuthScope;

  @ManyToOne(() => OAuthClientACL, (acl: OAuthClientACL) => acl.accountsWithScopes, { nullable: false })
  acl: OAuthClientACL;

}
