import { UpdateOrderStatusUsecase } from 'src/usecases/order/update-status/update-order-status.usecase';
import {
  FakeUnitOfWork,
  InMemoryAuditLogRepository,
  InMemoryOrderRepository,
  InMemoryProductRepository,
  InMemoryStockMovementRepository,
  InMemoryTableRepository,
} from './fakes/in-memory';
import { cerveja, openTable, orderFor, picanha } from './fakes/builders';

function setup() {
  const orders = new InMemoryOrderRepository();
  const products = new InMemoryProductRepository();
  const tables = new InMemoryTableRepository();
  const movements = new InMemoryStockMovementRepository();
  const logs = new InMemoryAuditLogRepository();
  const uow = new FakeUnitOfWork([orders, products, tables, movements, logs]);
  return {
    usecase: new UpdateOrderStatusUsecase(uow, orders, tables, products, movements, logs),
    orders,
    products,
    tables,
    movements,
    logs,
  };
}

describe('UpdateOrderStatusUsecase', () => {
  it('avança o pedido na ordem da cozinha', async () => {
    const s = setup();
    const table = openTable();
    const order = orderFor(table, [{ product: cerveja(), quantity: 1 }]);
    s.tables.items = [table];
    s.orders.items = [order];

    await s.usecase.execute(order.getId(), 'PREPARING', 'cozinha');
    await s.usecase.execute(order.getId(), 'READY', 'cozinha');
    await s.usecase.execute(order.getId(), 'DELIVERED', 'cozinha');
    expect(order.getStatus()).toBe('DELIVERED');
    expect(s.logs.items).toHaveLength(3);
  });

  it('recusa voltar de entregue para aguardando e fechar pela rota de status', async () => {
    const s = setup();
    const table = openTable();
    const order = orderFor(table, [{ product: cerveja(), quantity: 1 }]);
    s.tables.items = [table];
    s.orders.items = [order];
    order.updateStatus('PREPARING');
    order.updateStatus('READY');
    order.updateStatus('DELIVERED');

    await expect(s.usecase.execute(order.getId(), 'PENDING', 'cozinha')).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
    await expect(s.usecase.execute(order.getId(), 'CLOSED', 'cozinha')).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
    expect(order.getStatus()).toBe('DELIVERED');
  });

  it('cancelar devolve o estoque e registra o estorno', async () => {
    const s = setup();
    const table = openTable();
    const meat = picanha(4500); // já baixado 500 g
    const order = orderFor(table, [{ product: meat, quantity: 500 }]);
    s.tables.items = [table];
    s.products.seed([meat]);
    s.orders.items = [order];

    await s.usecase.execute(order.getId(), 'CANCELLED', 'gerente', 'cliente desistiu');

    expect(order.getStatus()).toBe('CANCELLED');
    expect(s.products.stock.get(meat.getId())).toBe(5000);
    expect(s.movements.items[0].getType()).toBe('ESTORNO');
    expect(s.logs.items[0].getAction()).toBe('PEDIDO_CANCELADO');
    expect(s.logs.items[0].getDetails()).toContain('cliente desistiu');
  });

  it('não cancela pedido já pronto', async () => {
    const s = setup();
    const table = openTable();
    const order = orderFor(table, [{ product: cerveja(), quantity: 1 }]);
    s.tables.items = [table];
    s.orders.items = [order];
    order.updateStatus('PREPARING');
    order.updateStatus('READY');
    await expect(s.usecase.execute(order.getId(), 'CANCELLED', 'gerente')).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });
});
