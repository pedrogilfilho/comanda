import type { ProductCategory } from '@comanda/shared'
import { http } from './http'

export type { ProductCategory }

export interface Product {
  id: string
  name: string
  description: string | null
  price: number // centavos por unidade (não carne)
  pricePerKg: number | null // centavos por kg (carne)
  minGrams: number | null // pedido mínimo em gramas (carne)
  category: ProductCategory
  isMeat: boolean
  available: boolean
  stock: number // gramas (carne) ou unidades
  minStock: number
  lowStock: boolean
}

export type StockAdjustment = 'ENTRADA' | 'SAIDA' | 'CONTAGEM'

export const listProducts = () => http.get<Product[]>('/products')

export const createProduct = (data: {
  name: string
  description?: string
  category: ProductCategory
  price?: number
  pricePerKg?: number
  minGrams?: number
  stock?: number
}) => http.post<{ id: string }>('/products', data)

export const removeProduct = (id: string) => http.delete<{ success: boolean }>(`/products/${id}`)

// stock = novo valor absoluto; o tipo vai para o histórico de movimentações
export const adjustStock = (id: string, stock: number, type: StockAdjustment, reason: string) =>
  http.patch<{ stock: number }>(`/products/${id}/stock`, { stock, type, reason })
