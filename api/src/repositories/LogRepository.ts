import { EntityRepository, Repository } from "typeorm";
import { LogEntity } from "@entities/Log";

@EntityRepository(LogEntity)
export class LogRepository extends Repository<LogEntity> {
    findByID(id: number): Promise<LogEntity | undefined> {
        return this.findOne({ where: { id } });
    }
    saveLog(log: LogEntity): Promise<LogEntity | undefined> {
        return this.save(log)
    }
}