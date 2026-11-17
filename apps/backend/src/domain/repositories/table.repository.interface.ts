import { Table } from '../entities/table/table.entity';

export abstract class TableRepository {
  abstract findAll(): Promise<Table[]>;
  abstract findById(id: string): Promise<Table | null>;
  abstract findByIdentifier(identifier: string): Promise<Table | null>;
  abstract create(table: Table): Promise<void>;
  abstract update(table: Table): Promise<void>;
}
