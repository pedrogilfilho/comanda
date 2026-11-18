import { Injectable } from '@nestjs/common';
import type { Product as ProductRow } from '@prisma/client';
import type { ProductCategory } from '@comanda/shared';
import { PrismaService } from 'src/infra/services/database/prisma/prisma.service';
import { ProductRepository } from 'src/domain/repositories/product.repository.interface';
import { Product } from 'src/domain/entities/product/product.entity';

@Injectable()
export class PrismaProductRepository extends ProductRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private toEntity(raw: ProductRow): Product {
    return Product.with({
      id: raw.id,
      name: raw.name,
      description: raw.description,
      price: raw.price,
      pricePerKg: raw.pricePerKg,
      minGrams: raw.minGrams,
      category: raw.category as ProductCategory,
      isMeat: raw.isMeat,
      available: raw.available,
      stock: raw.quantidadeDisponivel,
      minStock: raw.quantidadeMinima,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  async findAll(): Promise<Product[]> {
    // Inclui itens removidos do cardápio, para que pedidos antigos continuem com nome correto
    const rows = await this.prisma.db.product.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    return rows.map((r) => this.toEntity(r));
  }

  async findById(id: string): Promise<Product | null> {
    const raw = await this.prisma.db.product.findUnique({ where: { id } });
    return raw ? this.toEntity(raw) : null;
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.db.product.findMany({ where: { id: { in: ids } } });
    return rows.map((r) => this.toEntity(r));
  }

  async findByName(name: string): Promise<Product | null> {
    const raw = await this.prisma.db.product.findFirst({ where: { name, available: true } });
    return raw ? this.toEntity(raw) : null;
  }

  async create(product: Product): Promise<void> {
    await this.prisma.db.product.create({
      data: {
        id: product.getId(),
        name: product.getName(),
        description: product.getDescription(),
        price: product.getPrice(),
        pricePerKg: product.getPricePerKg(),
        minGrams: product.getMinGrams(),
        category: product.getCategory(),
        isMeat: product.getIsMeat(),
        available: product.getAvailable(),
        quantidadeDisponivel: product.getStock(),
        quantidadeMinima: product.getMinStock(),
        createdAt: product.getCreatedAt(),
        updatedAt: product.getUpdatedAt(),
      },
    });
  }

  async update(product: Product): Promise<void> {
    await this.prisma.db.product.update({
      where: { id: product.getId() },
      data: {
        name: product.getName(),
        description: product.getDescription(),
        available: product.getAvailable(),
        quantidadeDisponivel: product.getStock(),
        updatedAt: product.getUpdatedAt(),
      },
    });
  }

  // Edição do cadastro: grava só esses campos, para não desfazer uma venda que baixou o estoque
  // entre a leitura e a escrita
  async updateDetails(product: Product): Promise<void> {
    await this.prisma.db.product.update({
      where: { id: product.getId() },
      data: {
        name: product.getName(),
        description: product.getDescription(),
        price: product.getPrice(),
        pricePerKg: product.getPricePerKg(),
        minGrams: product.getMinGrams(),
        category: product.getCategory(),
        updatedAt: product.getUpdatedAt(),
      },
    });
  }

  async hasOrders(id: string): Promise<boolean> {
    return (await this.prisma.db.orderItem.count({ where: { productId: id } })) > 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.db.product.delete({ where: { id } });
  }

  // UPDATE condicional: dois pedidos simultâneos nunca vendem o mesmo estoque.
  async decrementStock(id: string, quantity: number): Promise<number | null> {
    const rows = await this.prisma.db.$queryRaw<{ before: number }[]>`
      UPDATE "product"
      SET "quantidadeDisponivel" = "quantidadeDisponivel" - ${quantity}, "updatedAt" = NOW()
      WHERE id = ${id} AND "quantidadeDisponivel" >= ${quantity}
      RETURNING ("quantidadeDisponivel" + ${quantity})::int AS before`;
    // ::int e Number(): sem isso o Postgres devolve bigint e o Prisma entrega BigInt
    return rows.length > 0 ? Number(rows[0].before) : null;
  }

  async incrementStock(id: string, quantity: number): Promise<number> {
    const rows = await this.prisma.db.$queryRaw<{ before: number }[]>`
      UPDATE "product"
      SET "quantidadeDisponivel" = "quantidadeDisponivel" + ${quantity}, "updatedAt" = NOW()
      WHERE id = ${id}
      RETURNING ("quantidadeDisponivel" - ${quantity})::int AS before`;
    return Number(rows[0]?.before ?? 0);
  }
}
