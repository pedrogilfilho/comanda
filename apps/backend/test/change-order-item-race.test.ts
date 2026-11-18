import { ChangeOrderItemUsecase } from 'src/usecases/order/change-item/change-order-item.usecase';
import { Order } from 'src/domain/entities/order/order.entity';
import {
  FakeUnitOfWork,
  InMemoryAuditLogRepository,
  InMemoryOrderRepository,
  InMemoryProductRepository,
  InMemoryStockMovementRepository,
  InMemoryTableRepository,
} from './fakes/in-memory';
import { cerveja, openTable, orderFor } from './fakes/builders';

const copy = (o: Order) =>
  Order.with({
    id: o.getId(),
    tableId: o.getTableId(),
    userId: o.getUserId(),
    status: o.getStatus(),
    totalAmount: o.getTotalAmount(),
    notes: o.getNotes(),
    items: [...o.getItems()],
    closedAccountId: o.getClosedAccountId(),
    createdAt: o.getCreatedAt(),
    updatedAt: o.getUpdatedAt(),
  });

// Como o banco: a leitura é uma cópia, e outra pessoa mexe no pedido logo depois dela
class RacingOrderRepository extends InMemoryOrderRepository {
  afterRead: (stored: Order) => void = () => {};
  override async findById(id: string) {
    const stored = this.items.find((o) => o.getId() === id);
    if (!stored) return null;
    const read = copy(stored);
    this.afterRead(stored);
    return read;
  }
}

function setup(quantity: number) {
  const orders = new RacingOrderRepository();
  const products = new InMemoryProductRepository();
  const tables = new InMemoryTableRepository();
  const movements = new InMemoryStockMovementRepository();
  const logs = new InMemoryAuditLogRepository();
  const beer = cerveja(10);
  const table = openTable();
  const order = orderFor(table, [{ product: beer, quantity }]);
  orders.items = [order];
  tables.items = [table];
  products.seed([beer]);
  return {
    usecase: new ChangeOrderItemUsecase(
      new FakeUnitOfWork([orders, products, tables, movements, logs]),
      orders,
      products,
      tables,
      movements,
      logs,
    ),
    orders,
    order,
    beer,
    products,
    movements,
  };
}

describe('Alterar item com o pedido mudando ao mesmo tempo', () => {
  it('cozinha começou o preparo logo depois da leitura: o garçom recebe conflito e nada muda', async () => {
    const s = setup(3);
    s.orders.afterRead = (stored) => stored.updateStatus('PREPARING');
    await expect(
      s.usecase.execute(
        {
          orderId: s.order.getId(),
          itemId: s.order.getItems()[0].getId(),
          quantity: 1,
          reason: 'LANCADO_A_MAIS',
        },
        { username: 'carlos', role: 'GARCOM' },
      ),
    ).rejects.toMatchObject({ code: 'ORDER_CHANGED' });
    expect(s.orders.items[0].getStatus()).toBe('PREPARING');
    expect((await s.products.findById(s.beer.getId()))!.getStock()).toBe(10);
    expect(s.movements.items).toHaveLength(0);
  });

  it('outra pessoa diminuiu o mesmo item: conflito e o estoque não volta duas vezes', async () => {
    const s = setup(3);
    const itemId = s.order.getItems()[0].getId();
    s.orders.afterRead = (stored) => stored.changeItemQuantity(itemId, 2);
    await expect(
      s.usecase.execute(
        { orderId: s.order.getId(), itemId, quantity: 1, reason: 'LANCADO_A_MAIS' },
        { username: 'gerente', role: 'GERENTE' },
      ),
    ).rejects.toMatchObject({ code: 'ORDER_CHANGED' });
    expect(s.orders.items[0].getItems()[0].getQuantity()).toBe(2);
    expect((await s.products.findById(s.beer.getId()))!.getStock()).toBe(10);
  });
});
