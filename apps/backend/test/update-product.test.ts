import { UpdateProductUsecase } from 'src/usecases/product/update/update-product.usecase';
import { InMemoryAuditLogRepository, InMemoryProductRepository } from './fakes/in-memory';
import { cerveja, picanha } from './fakes/builders';

function setup() {
  const products = new InMemoryProductRepository();
  const logs = new InMemoryAuditLogRepository();
  const beer = cerveja(10);
  const meat = picanha(5000);
  products.seed([beer, meat]);
  return { usecase: new UpdateProductUsecase(products, logs), products, logs, beer, meat };
}

describe('UpdateProductUsecase', () => {
  it('edita nome, preço e descrição de uma bebida', async () => {
    const s = setup();
    await s.usecase.execute(
      s.beer.getId(),
      { name: 'Cerveja lata', description: '350 ml', category: 'BEBIDA', price: 1800 },
      'admin',
    );
    const saved = (await s.products.findById(s.beer.getId()))!;
    expect(saved.getName()).toBe('Cerveja lata');
    expect(saved.getDescription()).toBe('350 ml');
    expect(saved.getPrice()).toBe(1800);
    expect(saved.getStock()).toBe(10);
    expect(s.logs.items).toHaveLength(1);
    expect(s.logs.items[0].getAction()).toBe('ITEM_EDITADO');
  });

  it('edita preço por kg e mínimo de uma carne', async () => {
    const s = setup();
    await s.usecase.execute(
      s.meat.getId(),
      { name: 'Picanha', category: 'CARNE', pricePerKg: 19900, minGrams: 400 },
      'admin',
    );
    const saved = (await s.products.findById(s.meat.getId()))!;
    expect(saved.getPricePerKg()).toBe(19900);
    expect(saved.getMinGrams()).toBe(400);
    expect(saved.getStock()).toBe(5000);
  });

  it('recusa trocar carne para bebida', async () => {
    const s = setup();
    await expect(
      s.usecase.execute(s.meat.getId(), { name: 'Picanha', category: 'BEBIDA', price: 1000 }, 'admin'),
    ).rejects.toMatchObject({ status: 400 });
    expect((await s.products.findById(s.meat.getId()))!.getCategory()).toBe('CARNE');
    expect(s.logs.items).toHaveLength(0);
  });

  it('recusa trocar bebida para carne', async () => {
    const s = setup();
    await expect(
      s.usecase.execute(s.beer.getId(), { name: 'Cerveja', category: 'CARNE', pricePerKg: 1000 }, 'admin'),
    ).rejects.toMatchObject({ status: 400 });
    expect((await s.products.findById(s.beer.getId()))!.getCategory()).toBe('BEBIDA');
  });

  it('recusa nome de outro produto', async () => {
    const s = setup();
    await expect(
      s.usecase.execute(s.beer.getId(), { name: 'Picanha', category: 'BEBIDA', price: 1500 }, 'admin'),
    ).rejects.toMatchObject({ status: 400 });
    expect((await s.products.findById(s.beer.getId()))!.getName()).toBe('Cerveja');
  });

  it('aceita o próprio nome', async () => {
    const s = setup();
    await expect(
      s.usecase.execute(s.beer.getId(), { name: 'Cerveja', category: 'BEBIDA', price: 1600 }, 'admin'),
    ).resolves.toEqual({ id: s.beer.getId() });
  });

  it('recusa produto inexistente ou removido', async () => {
    const s = setup();
    await expect(
      s.usecase.execute('nao-existe', { name: 'X', category: 'BEBIDA', price: 100 }, 'admin'),
    ).rejects.toMatchObject({ status: 404 });
    s.beer.setAvailable(false);
    await expect(
      s.usecase.execute(s.beer.getId(), { name: 'Cerveja', category: 'BEBIDA', price: 100 }, 'admin'),
    ).rejects.toMatchObject({ status: 404 });
  });
});
