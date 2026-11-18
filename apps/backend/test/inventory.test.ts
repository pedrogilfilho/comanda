import { InventoryUsecase } from 'src/usecases/product/inventory/inventory.usecase';
import {
  FakeUnitOfWork,
  InMemoryAuditLogRepository,
  InMemoryProductRepository,
  InMemoryStockMovementRepository,
} from './fakes/in-memory';
import { cerveja, picanha } from './fakes/builders';

function setup() {
  const products = new InMemoryProductRepository();
  const movements = new InMemoryStockMovementRepository();
  const logs = new InMemoryAuditLogRepository();
  const uow = new FakeUnitOfWork([products, movements, logs]);
  const beer = cerveja(10);
  const meat = picanha(5000);
  products.seed([beer, meat]);
  return {
    usecase: new InventoryUsecase(uow, products, movements, logs),
    products,
    movements,
    logs,
    beer,
    meat,
  };
}

describe('InventoryUsecase', () => {
  it('grava só os itens que mudaram', async () => {
    const s = setup();
    const res = await s.usecase.execute(
      [
        { productId: s.beer.getId(), stock: 7 },
        { productId: s.meat.getId(), stock: 5000 },
      ],
      'admin',
    );
    expect(res).toEqual({ changed: 1 });
    expect((await s.products.findById(s.beer.getId()))!.getStock()).toBe(7);
    expect(s.movements.items).toHaveLength(1);
    const m = s.movements.items[0];
    expect(m.getType()).toBe('CONTAGEM');
    expect(m.getNote()).toBe('Inventário');
    expect(m.getBefore()).toBe(10);
    expect(m.getAfter()).toBe(7);
    expect(s.logs.items).toHaveLength(1);
    expect(s.logs.items[0].getAction()).toBe('INVENTARIO_FEITO');
    expect(s.logs.items[0].getDetails()).toBe('1 item: Cerveja 10 un → 7 un');
  });

  it('desfaz tudo se um item não existe', async () => {
    const s = setup();
    await expect(
      s.usecase.execute(
        [
          { productId: s.beer.getId(), stock: 3 },
          { productId: 'nao-existe', stock: 1 },
        ],
        'admin',
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect((await s.products.findById(s.beer.getId()))!.getStock()).toBe(10);
    expect(s.movements.items).toHaveLength(0);
    expect(s.logs.items).toHaveLength(0);
  });

  it('recusa quando nada mudou', async () => {
    const s = setup();
    await expect(
      s.usecase.execute([{ productId: s.beer.getId(), stock: 10 }], 'admin'),
    ).rejects.toMatchObject({ status: 400, message: 'Nenhum item mudou' });
    expect(s.movements.items).toHaveLength(0);
  });

  it('recusa estoque negativo ou não inteiro', async () => {
    const s = setup();
    await expect(
      s.usecase.execute([{ productId: s.beer.getId(), stock: -1 }], 'admin'),
    ).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      s.usecase.execute([{ productId: s.beer.getId(), stock: 2.5 }], 'admin'),
    ).rejects.toMatchObject({
      status: 400,
    });
    expect((await s.products.findById(s.beer.getId()))!.getStock()).toBe(10);
  });

  it('recusa o mesmo produto duas vezes', async () => {
    const s = setup();
    await expect(
      s.usecase.execute(
        [
          { productId: s.beer.getId(), stock: 3 },
          { productId: s.beer.getId(), stock: 4 },
        ],
        'admin',
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
