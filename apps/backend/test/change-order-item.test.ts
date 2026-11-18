import { ChangeOrderItemUsecase } from 'src/usecases/order/change-item/change-order-item.usecase';
import { Order } from 'src/domain/entities/order/order.entity';
import { OrderItem } from 'src/domain/entities/order-item/order-item.entity';
import type { Product } from 'src/domain/entities/product/product.entity';
import {
  FakeUnitOfWork,
  InMemoryAuditLogRepository,
  InMemoryOrderRepository,
  InMemoryProductRepository,
  InMemoryStockMovementRepository,
  InMemoryTableRepository,
} from './fakes/in-memory';
import { cerveja, openTable, orderFor, picanha } from './fakes/builders';

const gerente = { username: 'gerente', role: 'GERENTE' as const };
const garcom = { username: 'carlos', role: 'GARCOM' as const };

function setup(products: Product[], items: (t: ReturnType<typeof openTable>) => Order) {
  const orders = new InMemoryOrderRepository();
  const productsRepo = new InMemoryProductRepository();
  const tables = new InMemoryTableRepository();
  const movements = new InMemoryStockMovementRepository();
  const logs = new InMemoryAuditLogRepository();
  const uow = new FakeUnitOfWork([orders, productsRepo, tables, movements, logs]);
  const table = openTable();
  const order = items(table);
  tables.items = [table];
  orders.items = [order];
  productsRepo.seed(products);
  return {
    usecase: new ChangeOrderItemUsecase(uow, orders, productsRepo, tables, movements, logs),
    order,
    stored: () => orders.items[0],
    item: order.getItems()[0],
    products: productsRepo,
    movements,
    logs,
  };
}

const stockOf = async (s: { products: InMemoryProductRepository }, p: Product) =>
  (await s.products.findById(p.getId()))!.getStock();

describe('ChangeOrderItemUsecase', () => {
  it('gerente diminui cerveja 4 → 1 lançado a mais: estoque volta 3', async () => {
    const beer = cerveja(10);
    const s = setup([beer], (t) => orderFor(t, [{ product: beer, quantity: 4 }]));
    const res = await s.usecase.execute(
      { orderId: s.order.getId(), itemId: s.item.getId(), quantity: 1, reason: 'LANCADO_A_MAIS' },
      gerente,
    );
    expect(res.total).toBe(1500);
    expect(s.stored().getTotalAmount()).toBe(1500);
    expect(await stockOf(s, beer)).toBe(13);
    expect(s.movements.items[0].getType()).toBe('ESTORNO');
    expect(s.movements.items[0].getNote()).toBe('Lançado a mais');
    expect(s.logs.items[0].getAction()).toBe('ITEM_DIMINUIDO');
    expect(s.logs.items[0].getDetails()).toBe('Mesa 5 — Cerveja: 4 un → 1 un (Lançado a mais)');
  });

  it('gerente tira picanha entregue como perda: estoque não volta', async () => {
    const meat = picanha(5000);
    const beer = cerveja(10);
    const s = setup([meat, beer], (t) => {
      const o = orderFor(t, [
        { product: meat, quantity: 400 },
        { product: beer, quantity: 1 },
      ]);
      o.updateStatus('PREPARING');
      o.updateStatus('READY');
      o.updateStatus('DELIVERED');
      return o;
    });
    await s.usecase.execute(
      { orderId: s.order.getId(), itemId: s.item.getId(), quantity: 0, reason: 'PERDA' },
      gerente,
    );
    expect(s.stored().getItems()).toHaveLength(1);
    expect(await stockOf(s, meat)).toBe(5000);
    const m = s.movements.items[0];
    expect([m.getType(), m.getBefore(), m.getAfter(), m.getNote()]).toEqual([
      'PERDA',
      5000,
      5000,
      'Perda: 0,4 kg',
    ]);
    expect(s.logs.items[0].getAction()).toBe('ITEM_TIRADO');
  });

  it('tirar o único item cancela o pedido', async () => {
    const beer = cerveja(10);
    const s = setup([beer], (t) => orderFor(t, [{ product: beer, quantity: 2 }]));
    await s.usecase.execute(
      { orderId: s.order.getId(), itemId: s.item.getId(), quantity: 0, reason: 'LANCADO_ERRADO' },
      gerente,
    );
    expect(s.stored().getStatus()).toBe('CANCELLED');
    expect(await stockOf(s, beer)).toBe(12);
  });

  it('garçom tira de pedido aguardando', async () => {
    const beer = cerveja(10);
    const s = setup([beer], (t) => orderFor(t, [{ product: beer, quantity: 2 }]));
    await s.usecase.execute(
      { orderId: s.order.getId(), itemId: s.item.getId(), quantity: 1, reason: 'LANCADO_ERRADO' },
      garcom,
    );
    expect(s.item.getQuantity()).toBe(2); // o item original é imutável
    expect(s.stored().getItems()[0].getQuantity()).toBe(1);
  });

  it('garçom não mexe em pedido em preparo', async () => {
    const beer = cerveja(10);
    const s = setup([beer], (t) => {
      const o = orderFor(t, [{ product: beer, quantity: 2 }]);
      o.updateStatus('PREPARING');
      return o;
    });
    await expect(
      s.usecase.execute(
        { orderId: s.order.getId(), itemId: s.item.getId(), quantity: 1, reason: 'LANCADO_A_MAIS' },
        garcom,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('garçom não registra perda', async () => {
    const beer = cerveja(10);
    const s = setup([beer], (t) => orderFor(t, [{ product: beer, quantity: 2 }]));
    await expect(
      s.usecase.execute(
        { orderId: s.order.getId(), itemId: s.item.getId(), quantity: 1, reason: 'PERDA' },
        garcom,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it.each([4, 5, -1, 1.5])('recusa nova quantidade %p (atual 4)', async (q) => {
    const beer = cerveja(10);
    const s = setup([beer], (t) => orderFor(t, [{ product: beer, quantity: 4 }]));
    await expect(
      s.usecase.execute(
        { orderId: s.order.getId(), itemId: s.item.getId(), quantity: q, reason: 'LANCADO_A_MAIS' },
        gerente,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(s.order.getTotalAmount()).toBe(6000);
  });

  it('carne abaixo do mínimo só tirando inteira', async () => {
    const meat = picanha(5000);
    const s = setup([meat], (t) => orderFor(t, [{ product: meat, quantity: 400 }]));
    await expect(
      s.usecase.execute(
        { orderId: s.order.getId(), itemId: s.item.getId(), quantity: 200, reason: 'LANCADO_A_MAIS' },
        gerente,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('pedido cancelado não muda', async () => {
    const beer = cerveja(10);
    const s = setup([beer], (t) => {
      const o = orderFor(t, [{ product: beer, quantity: 2 }]);
      o.updateStatus('CANCELLED');
      return o;
    });
    await expect(
      s.usecase.execute(
        { orderId: s.order.getId(), itemId: s.item.getId(), quantity: 1, reason: 'LANCADO_A_MAIS' },
        gerente,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('item inexistente é 404', async () => {
    const beer = cerveja(10);
    const s = setup([beer], (t) => orderFor(t, [{ product: beer, quantity: 2 }]));
    await expect(
      s.usecase.execute(
        { orderId: s.order.getId(), itemId: 'x', quantity: 1, reason: 'LANCADO_A_MAIS' },
        gerente,
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('dois itens do mesmo produto: muda só o escolhido', async () => {
    const beer = cerveja(10);
    const s = setup([beer], (t) =>
      Order.create({
        tableId: t.getId(),
        userId: 'u1',
        items: [3, 2].map((quantity) =>
          OrderItem.create({ productId: beer.getId(), quantity, unitPrice: 1500, weighed: false }),
        ),
      }),
    );
    const second = s.order.getItems()[1];
    await s.usecase.execute(
      { orderId: s.order.getId(), itemId: second.getId(), quantity: 1, reason: 'LANCADO_A_MAIS' },
      gerente,
    );
    expect(
      s
        .stored()
        .getItems()
        .map((i) => i.getQuantity()),
    ).toEqual([3, 1]);
    expect(await stockOf(s, beer)).toBe(11);
  });
});
