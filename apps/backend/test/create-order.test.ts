import { CreateOrderUsecase } from 'src/usecases/order/create/create-order.usecase';
import { AppError } from 'src/shared/errors/app-error';
import {
  FakeUnitOfWork,
  InMemoryAuditLogRepository,
  InMemoryOrderRepository,
  InMemoryProductRepository,
  InMemoryStockMovementRepository,
  InMemoryTableRepository,
} from './fakes/in-memory';
import { cerveja, openTable, picanha } from './fakes/builders';

function setup() {
  const orders = new InMemoryOrderRepository();
  const products = new InMemoryProductRepository();
  const tables = new InMemoryTableRepository();
  const movements = new InMemoryStockMovementRepository();
  const logs = new InMemoryAuditLogRepository();
  const uow = new FakeUnitOfWork([orders, products, tables, movements, logs]);
  const usecase = new CreateOrderUsecase(uow, orders, products, tables, movements, logs);
  return { usecase, orders, products, tables, movements, logs };
}

describe('CreateOrderUsecase', () => {
  it('cria o pedido, baixa o estoque e registra a movimentação', async () => {
    const s = setup();
    const table = openTable();
    const meat = picanha(5000);
    const beer = cerveja(10);
    s.tables.items = [table];
    s.products.seed([meat, beer]);

    const result = await s.usecase.execute(
      {
        tableId: table.getId(),
        userId: 'u1',
        items: [
          { productId: meat.getId(), quantity: 500 },
          { productId: beer.getId(), quantity: 2, notes: ' bem  gelada ' },
        ],
      },
      'carlos',
    );

    expect(result.total).toBe(8900 + 3000); // 500 g a R$ 178/kg + 2 cervejas
    expect(s.orders.items).toHaveLength(1);
    expect(s.products.stock.get(meat.getId())).toBe(4500);
    expect(s.products.stock.get(beer.getId())).toBe(8);
    expect(s.movements.items.map((m) => m.getType())).toEqual(['VENDA', 'VENDA']);
    expect(s.orders.items[0].getItems()[1].getNotes()).toBe('bem gelada');
    expect(s.logs.items[0].getAction()).toBe('PEDIDO_LANCADO');
  });

  it('recusa carne abaixo do mínimo', async () => {
    const s = setup();
    const table = openTable();
    const meat = picanha();
    s.tables.items = [table];
    s.products.seed([meat]);

    await expect(
      s.usecase.execute(
        { tableId: table.getId(), userId: 'u1', items: [{ productId: meat.getId(), quantity: 200 }] },
        'carlos',
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    expect(s.orders.items).toHaveLength(0);
  });

  it('não cria pedido nem baixa nada quando falta estoque de um dos itens (rollback)', async () => {
    const s = setup();
    const table = openTable();
    const meat = picanha(5000);
    const beer = cerveja(1);
    s.tables.items = [table];
    s.products.seed([meat, beer]);

    await expect(
      s.usecase.execute(
        {
          tableId: table.getId(),
          userId: 'u1',
          items: [
            { productId: meat.getId(), quantity: 500 },
            { productId: beer.getId(), quantity: 2 },
          ],
        },
        'carlos',
      ),
    ).rejects.toMatchObject({ code: 'STOCK_INSUFFICIENT' });

    expect(s.orders.items).toHaveLength(0);
    expect(s.products.stock.get(meat.getId())).toBe(5000); // a baixa da carne foi desfeita
    expect(s.movements.items).toHaveLength(0);
  });

  it('soma a quantidade do mesmo produto em linhas diferentes', async () => {
    const s = setup();
    const table = openTable();
    const beer = cerveja(3);
    s.tables.items = [table];
    s.products.seed([beer]);

    await expect(
      s.usecase.execute(
        {
          tableId: table.getId(),
          userId: 'u1',
          items: [
            { productId: beer.getId(), quantity: 2 },
            { productId: beer.getId(), quantity: 2 },
          ],
        },
        'carlos',
      ),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('exige mesa aberta', async () => {
    const s = setup();
    const table = openTable();
    table.free();
    s.tables.items = [table];
    s.products.seed([cerveja()]);
    await expect(
      s.usecase.execute(
        {
          tableId: table.getId(),
          userId: 'u1',
          items: [{ productId: s.products.items[0].getId(), quantity: 1 }],
        },
        'carlos',
      ),
    ).rejects.toMatchObject({ code: 'TABLE_NOT_OPEN' });
  });
});
