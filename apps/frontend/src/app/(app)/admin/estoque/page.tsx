'use client'

import { listProducts } from '@/services/products'
import { useResource } from '@/hooks/useResource'
import StockManager from '@/components/features/admin/StockManager'

export default function EstoquePage() {
  const { data, loading, reload } = useResource(listProducts, 'Erro ao carregar o estoque')
  return <StockManager products={data ?? []} loading={loading} onChange={reload} />
}
