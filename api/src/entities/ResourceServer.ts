import { Scope } from "@tsed/di";
import {
    Column,
    Entity,
    Generated,
    JoinTable,
    ManyToMany,
    OneToMany,
    PrimaryGeneratedColumn,
  } from "typeorm";
  import { AccountEntity } from "./Account";
  import { CrossAclGroupScopeEntity } from "./CrossAclGroupScope";
import { OAuthScope } from "./OAuthScope";
  
  @Entity({
    name: "resource_servers",
    engine: "InnoDB",
  })
  export class ResourceServer {
    constructor(resourceServer: ResourceServer) {
      Object.assign(this, resourceServer);
    }
  
    @PrimaryGeneratedColumn()
    id?: number;
  
    @Column()
    @Generated("uuid")
    uuid?: string;
  
    @Column({ type: "varchar", unique: true })
    identifier: string;

    @Column({ type: "varchar", unique: true })
    name: string;
  
    @Column({ type: "boolean", default: false })
    is_system: boolean;
  
    @ManyToMany(() => OAuthScope, (scope) => scope.resourceServer)
    @JoinTable({
      name: "resource_servers_scopes",
      joinColumn: {
        name: "resource_server_id",
        referencedColumnName: "id",
      },
      inverseJoinColumn: {
        name: "scope_id",
        referencedColumnName: "id",
      },
    })
    scopes?: AccountEntity[];
  
  }
  