import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateOrderUsecase } from 'src/usecases/order/create/create-order.usecase';
import { ListOrdersByTableUsecase } from 'src/usecases/order/list-by-table/list-orders-by-table.usecase';
import { ListKitchenOrdersUsecase } from 'src/usecases/order/list-kitchen/list-kitchen-orders.usecase';
import { UpdateOrderStatusUsecase } from 'src/usecases/order/update-status/update-order-status.usecase';
import { Roles } from 'src/infra/web/auth/decorators/roles.decorator';
import { CurrentUser, type RequestUser } from 'src/infra/web/auth/request-user';
import { AppError } from 'src/shared/errors/app-error';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly createOrderUsecase: CreateOrderUsecase,
    private readonly listOrdersByTableUsecase: ListOrdersByTableUsecase,
    private readonly listKitchenOrdersUsecase: ListKitchenOrdersUsecase,
    private readonly updateOrderStatusUsecase: UpdateOrderStatusUsecase,
  ) {}

  @Roles('GARCOM', 'GERENTE', 'ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: RequestUser, @Body() body: CreateOrderDto) {
    return this.createOrderUsecase.execute({ tableId: body.tableId, userId: user.userId, items: body.items }, user.username);
  }

  @Roles('COZINHA', 'GERENTE', 'ADMIN')
  @Get('kitchen')
  kitchen() {
    return this.listKitchenOrdersUsecase.execute();
  }

  @Get('table/:tableId')
  byTable(@Param('tableId', ParseUUIDPipe) tableId: string) {
    return this.listOrdersByTableUsecase.execute(tableId);
  }

  // Cozinha avança o pedido; cancelar é só para Gerente e Admin
  @Roles('COZINHA', 'GERENTE', 'ADMIN')
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateOrderStatusDto) {
    if (body.status === 'CANCELLED' && user.role === 'COZINHA') {
      throw AppError.forbidden('Só gerente ou administrador pode cancelar um pedido');
    }
    return this.updateOrderStatusUsecase.execute(id, body.status, user.username, body.reason);
  }
}
