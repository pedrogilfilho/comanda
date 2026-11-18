import { Controller, Get, Query } from '@nestjs/common';
import { GetReportsUsecase } from 'src/usecases/report/get-reports/get-reports.usecase';
import { ListLogsUsecase } from 'src/usecases/report/list-logs/list-logs.usecase';
import { ListClosedAccountsUsecase } from 'src/usecases/report/list-closed-accounts/list-closed-accounts.usecase';
import { Roles } from 'src/infra/web/auth/decorators/roles.decorator';
import { AppError } from 'src/shared/errors/app-error';
import { Utils } from 'src/shared/utils/utils';
import { DateRangeDto, LogsQueryDto } from './dto/report.dto';

@Controller()
export class ReportController {
  constructor(
    private readonly getReportsUsecase: GetReportsUsecase,
    private readonly listLogsUsecase: ListLogsUsecase,
    private readonly listClosedAccountsUsecase: ListClosedAccountsUsecase,
  ) {}

  private range({ from, to }: DateRangeDto) {
    const r = Utils.dayRangeBrt(from, to);
    if (!r)
      throw AppError.badRequest(
        'VALIDATION',
        'Período inválido. Use datas no formato AAAA-MM-DD e a data inicial antes da final.',
      );
    return r;
  }

  @Roles('ADMIN', 'GERENTE')
  @Get('reports')
  reports(@Query() query: DateRangeDto) {
    const r = this.range(query);
    return this.getReportsUsecase.execute(r.from, r.to);
  }

  @Roles('ADMIN', 'GERENTE')
  @Get('closed-accounts')
  closedAccounts(@Query() query: DateRangeDto) {
    const r = this.range(query);
    return this.listClosedAccountsUsecase.execute(r.from, r.to);
  }

  @Roles('ADMIN')
  @Get('logs')
  logs(@Query() query: LogsQueryDto) {
    const r = this.range(query);
    return this.listLogsUsecase.execute(r.from, r.to, query.action);
  }
}
