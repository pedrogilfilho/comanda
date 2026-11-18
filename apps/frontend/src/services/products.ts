import type { Product, ProductCategory, StockAdjustment } from '@/types/api';
import { http } from './http';

export type { Product, StockAdjustment } from '@/types/api';

export const listProducts = () => http.get<Product[]>('/products');

export const createProduct = (data: {
  name: string;
  description?: string;
  category: ProductCategory;
  price?: number;
  pricePerKg?: number;
  minGrams?: number;
  stock?: number;
}) => http.post<{ id: string }>('/products', data);

export const removeProduct = (id: string) => http.delete<{ success: boolean }>(`/products/${id}`);

// stock = novo valor absoluto; o tipo vai para o histórico de movimentações
export const adjustStock = (id: string, stock: number, type: StockAdjustment, reason: string) =>
  http.patch<{ stock: number }>(`/products/${id}/stock`, { stock, type, reason });
