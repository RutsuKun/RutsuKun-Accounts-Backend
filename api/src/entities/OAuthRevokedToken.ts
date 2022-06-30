import { Column, CreateDateColumn, Entity, Generated, JoinColumn, ManyToOne, OneToOne, PrimaryColumn } from "typeorm";
import { AccountEntity } from "./Account";
import { ClientEntity } from "./Client";

@Entity({
  name: "oauth_revoked_tokens",
  engine: "InnoDB",
})
export class OAuthRevokedToken {
  @PrimaryColumn()
  @Generated("uuid")
  uuid?: string;
  
  @Column({ type: "varchar" })
  type: "access_token" | "refresh_token";
  
  @Column({ type: "varchar" })
  jti: string;
  
  @Column({ type: "numeric" })
  exp: number;
  
  @ManyToOne((type) => AccountEntity, (account) => account.id)
  @JoinColumn({ name: "account_id", referencedColumnName: "id" })
  account: AccountEntity;
  
  @ManyToOne((type) => ClientEntity, (client) => client.client_id, { cascade: true })
  @JoinColumn({ name: "client_id", referencedColumnName: "client_id" })
  client: ClientEntity;
  
  @CreateDateColumn({ name: "created_at" })
  created_at?: Date;
}