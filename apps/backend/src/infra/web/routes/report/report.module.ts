import { Module } from '@nestjs/common';
import { GetReportsUsecase } from 'src/usecases/report/get-reports/get-reports.usecase';
import { ListLogsUsecase } from 'src/usecases/report/list-logs/list-logs.usecase';
import { ListClosedAccountsUsecase } from 'src/usecases/report/list-closed-accounts/list-closed-accounts.usecase';
import { ReportController } from './report.controller';

@Module({
  controllers: [ReportController],
  providers: [GetReportsUsecase, ListClosedAccountsUsecase, ListLogsUsecase],
})
export class ReportModule {}
