import { Table } from '../entities/table/table.entity';

export abstract class TableRepository {
  abstract findAll(): Promise<Table[]>;
  abstract findById(id: string): Promise<Table | null>;
  abstract findByIdentifier(identifier: string): Promise<Table | null>;
  abstract create(table: Table): Promise<void>;
  abstract update(table: Table): Promise<void>;
  // Gravações que não atropelam outra abertura simultânea: false se perdeu a corrida
  abstract createIfAbsent(table: Table): Promise<boolean>; // false se o identificador já existe
  // Ocupa a mesa (table.occupy) só se ela ainda estiver livre no banco; false se não estava
  abstract occupyIfFree(table: Table, clientName: string | null, openedBy: string): Promise<boolean>;
}
