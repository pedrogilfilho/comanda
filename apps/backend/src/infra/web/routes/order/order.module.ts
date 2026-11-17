import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { CreateOrderUsecase } from 'src/usecases/order/create/create-order.usecase';
import { ListOrdersByTableUsecase } from 'src/usecases/order/list-by-table/list-orders-by-table.usecase';
import { ListKitchenOrdersUsecase } from 'src/usecases/order/list-kitchen/list-kitchen-orders.usecase';
import { UpdateOrderStatusUsecase } from 'src/usecases/order/update-status/update-order-status.usecase';

@Module({
  controllers: [OrderController],
  providers: [CreateOrderUsecase, ListOrdersByTableUsecase, ListKitchenOrdersUsecase, UpdateOrderStatusUsecase],
})
export class OrderModule {}
