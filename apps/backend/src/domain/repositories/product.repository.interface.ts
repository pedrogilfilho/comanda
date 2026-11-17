import { Product } from '../entities/product/product.entity';

export abstract class ProductRepository {
  abstract findAll(): Promise<Product[]>;
  abstract findById(id: string): Promise<Product | null>;
  abstract findByIds(ids: string[]): Promise<Product[]>;
  abstract findByName(name: string): Promise<Product | null>;
  abstract create(product: Product): Promise<void>;
  abstract update(product: Product): Promise<void>;
  abstract hasOrders(id: string): Promise<boolean>;
  abstract delete(id: string): Promise<void>;
  // Baixa atômica: só desconta se houver estoque suficiente. Devolve o estoque anterior, ou null se faltou.
  abstract decrementStock(id: string, quantity: number): Promise<number | null>;
  // Devolve ao estoque (cancelamento). Retorna o estoque anterior.
  abstract incrementStock(id: string, quantity: number): Promise<number>;
}
