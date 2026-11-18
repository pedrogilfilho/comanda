'use client'

import { listProducts } from '@/services/products'
import { useResource } from '@/hooks/useResource'
import MenuManager from '@/components/features/admin/MenuManager'

export default function CardapioPage() {
  const { data, loading, reload } = useResource(listProducts, 'Erro ao carregar o cardápio')
  return <MenuManager products={data ?? []} loading={loading} onChange={reload} />
}
