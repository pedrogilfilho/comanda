import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ListTablesUsecase } from 'src/usecases/table/list/list-tables.usecase';
import { OpenTableUsecase } from 'src/usecases/table/open/open-table.usecase';
import { CloseTableUsecase } from 'src/usecases/table/close/close-table.usecase';
import { Roles } from 'src/infra/web/auth/decorators/roles.decorator';
import { CurrentUser, type RequestUser } from 'src/infra/web/auth/request-user';
import { CloseTableDto, OpenTableDto } from './dto/table.dto';

@Controller('tables')
export class TableController {
  constructor(
    private readonly listTablesUsecase: ListTablesUsecase,
    private readonly openTableUsecase: OpenTableUsecase,
    private readonly closeTableUsecase: CloseTableUsecase,
  ) {}

  @Get()
  list() {
    return this.listTablesUsecase.execute();
  }

  @Roles('GARCOM', 'GERENTE', 'ADMIN')
  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  open(@CurrentUser() user: RequestUser, @Body() body: OpenTableDto) {
    return this.openTableUsecase.execute(body, user.username);
  }

  // Garçom também fecha a conta (decisão do dono); só o Admin passa por cima de pedidos em preparo
  @Roles('GARCOM', 'GERENTE', 'ADMIN')
  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  close(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CloseTableDto,
  ) {
    return this.closeTableUsecase.execute({
      tableId: id,
      actor: user.username,
      actorRole: user.role,
      payments: (body.payments ?? []).map((p) => ({
        method: p.method,
        amount: p.amount,
        installments: p.installments ?? 1,
      })),
    });
  }
}
