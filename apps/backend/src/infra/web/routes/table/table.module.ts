import { Module } from '@nestjs/common';
import { TableController } from './table.controller';
import { ListTablesUsecase } from 'src/usecases/table/list/list-tables.usecase';
import { OpenTableUsecase } from 'src/usecases/table/open/open-table.usecase';
import { CloseTableUsecase } from 'src/usecases/table/close/close-table.usecase';

@Module({
  controllers: [TableController],
  providers: [ListTablesUsecase, OpenTableUsecase, CloseTableUsecase],
})
export class TableModule {}
