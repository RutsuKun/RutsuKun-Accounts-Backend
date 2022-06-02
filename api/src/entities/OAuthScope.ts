import {
    Column,
    Entity,
    Generated,
    ManyToMany,
    ManyToOne,
    OneToMany,
    PrimaryColumn,
    PrimaryGeneratedColumn,
  } from "typeorm";
import { AccountEntity } from "./Account";
import { CrossAclAccountScopeEntity } from "./CrossAclAccountScope";
import { CrossAclGroupScopeEntity } from "./CrossAclGroupScope";
import { OAuthAuthorization } from "./OAuthAuthorization";
import { OAuthClientACL } from "./OAuthClientACL";
import { OrganizationMember } from "./OrganizationMember";
// import { ResourceServer } from "./ResourceServer";
  
@Entity({
  name: "oauth_scopes",
  engine: "InnoDB",
})
export class OAuthScope {
  constructor(scope: OAuthScope) {
    Object.assign(this, scope);
  }

  @PrimaryGeneratedColumn()
  id?: number;

  @Generated("uuid")
  @Column()
  uuid?: string;

  @Column({ type: "boolean", default: false })
  default: boolean;

  @Column({ type: "boolean", default: false })
  system: boolean;
    
  @Column()
  name: string;

  @ManyToMany(() => OAuthClientACL, (acl) => acl.scopes, { onUpdate: "CASCADE", onDelete: "CASCADE" })
  acls?: CrossAclAccountScopeEntity[];

  @OneToMany(() => CrossAclAccountScopeEntity, (accountScope) => accountScope.account)
  scopesAccounts?: CrossAclAccountScopeEntity[];

  @OneToMany(() => CrossAclGroupScopeEntity, (groupScope) => groupScope.group)
  scopesGroups?: CrossAclAccountScopeEntity[];

  @ManyToMany(() => OrganizationMember, (member) => member.scopes, { onUpdate: "CASCADE", onDelete: "CASCADE" })
  scopesOrganizationMembers?: OAuthScope[];

  @ManyToMany(() => OAuthAuthorization, (authz) => authz.scopes, { onUpdate: "CASCADE", onDelete: "CASCADE" })
  authorizations?: CrossAclAccountScopeEntity[];

  @ManyToMany(() => AccountEntity, (account) => account.assignedPermissions)
  assignedAccounts?: AccountEntity[];

  @ManyToMany(() => OrganizationMember, (member) => member.scopes, { onUpdate: "CASCADE", onDelete: "CASCADE" })
  organizationMembers?: OrganizationMember[];

  // @ManyToMany(() => ResourceServer, (rs) => rs.scopes, { onUpdate: "CASCADE", onDelete: "CASCADE" })
  // resourceServer?: ResourceServer[];
}
  