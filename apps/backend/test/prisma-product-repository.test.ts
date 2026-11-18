import { PrismaProductRepository } from 'src/infra/repositories/prisma/product/prisma-product.repository';
import type { PrismaService } from 'src/infra/services/database/prisma/prisma.service';
import { cerveja, picanha } from './fakes/builders';

// Confere o que cada escrita manda para o banco (o fake em memória não pega mapeamento errado)
function setup() {
  const update = jest.fn().mockResolvedValue(undefined);
  const prisma = { db: { product: { update } } } as unknown as PrismaService;
  return { repo: new PrismaProductRepository(prisma), update };
}

describe('PrismaProductRepository', () => {
  it('updateDetails grava o cadastro e não toca no estoque', async () => {
    const s = setup();
    const beer = cerveja(10);
    beer.edit({ name: 'Cerveja lata', description: '350 ml', category: 'BEBIDA', price: 1800 });
    await s.repo.updateDetails(beer);
    const data = s.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: 'Cerveja lata',
      description: '350 ml',
      price: 1800,
      category: 'BEBIDA',
    });
    expect(data).not.toHaveProperty('quantidadeDisponivel');
  });

  it('updateDetails grava preço por kg e mínimo da carne', async () => {
    const s = setup();
    const meat = picanha();
    meat.edit({ name: 'Picanha', description: null, category: 'CARNE', pricePerKg: 19900, minGrams: 400 });
    await s.repo.updateDetails(meat);
    expect(s.update.mock.calls[0][0].data).toMatchObject({ pricePerKg: 19900, minGrams: 400 });
  });

  it('update (estoque e disponível) não regrava preço nem categoria', async () => {
    const s = setup();
    const beer = cerveja(10);
    beer.setStock(7);
    await s.repo.update(beer);
    const data = s.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ quantidadeDisponivel: 7 });
    expect(data).not.toHaveProperty('price');
    expect(data).not.toHaveProperty('category');
  });
});
