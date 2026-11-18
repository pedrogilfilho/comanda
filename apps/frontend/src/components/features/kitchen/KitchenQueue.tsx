'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { NEXT_ORDER_STATUS, ORDER_STATUS_LABEL, type OrderStatus } from '@comanda/shared'
import { errorMessage } from '@/services/http'
import { listKitchenOrders, updateOrderStatus } from '@/services/orders'
import type { KitchenOrder } from '@/types/api'
import { weight, time } from '@/lib/format'
import { POLL_MS } from '@/constants'
import { usePolling } from '@/hooks/usePolling'
import PageTitle from '@/components/ui/PageTitle'
import Skeleton from '@/components/ui/Skeleton'

// Botão da cozinha para o próximo passo do pedido
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Iniciar preparo',
  PREPARING: 'Marcar pronto',
  READY: 'Marcar entregue',
}

export default function KitchenQueue() {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setOrders(await listKitchenOrders())
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar a fila'))
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])
  usePolling(load, POLL_MS)

  const advance = async (o: KitchenOrder) => {
    const next = NEXT_ORDER_STATUS[o.status]
    if (!next || next === 'PENDING' || next === 'CLOSED') return
    try {
      await updateOrderStatus(o.id, next)
      await load()
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao atualizar status'))
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageTitle
        title="Fila de pedidos"
        subtitle="Pedidos aguardando preparo"
        actions={<button onClick={load} className="px-4 py-2 rounded-xl font-semibold text-sm" style={{ background: '#f0ebe4', color: '#6b5a4a' }}>Atualizar</button>}
      />
      {loading ? <Skeleton /> : orders.length === 0 ? (
        <p className="text-center py-12 text-lg text-[#6b5a4a]">Nenhum pedido no momento</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {orders.map((o) => {
            const hot = o.status === 'PREPARING'
            const ready = o.status === 'READY'
            const nextLabel = NEXT_LABEL[o.status]
            return (
              <article key={o.id} className="rounded-2xl p-4" style={{ background: hot ? 'rgba(196,92,42,0.08)' : ready ? 'rgba(61,92,58,0.08)' : '#fff9f2', border: `1.5px solid ${hot ? '#c45c2a' : ready ? '#3d5c3a' : '#d9cfc2'}` }}>
                <div className="flex items-start justify-between mb-2">
                  <div><h2 className="font-semibold text-[#2a1f14]">Mesa {o.tableIdentifier}</h2><p className="text-xs" style={{ color: '#6b5a4a' }}>{o.clientName ? `${o.clientName} · ` : ''}{time(o.createdAt)}</p></div>
                  <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'rgba(0,0,0,0.06)', color: '#2a1f14' }}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</span>
                </div>
                <ul>
                  {o.items.map((it, i) => (
                    <li key={i}>
                      <p className="text-sm text-[#2a1f14]">• {it.productName} <strong>{it.isMeat ? weight(it.quantity) : `x${it.quantity}`}</strong></p>
                      {it.notes && <p className="text-xs font-semibold ml-3 px-2 py-0.5 rounded inline-block" style={{ background: 'rgba(232,160,74,0.18)', color: '#7a4a0e' }}>Obs.: {it.notes}</p>}
                    </li>
                  ))}
                </ul>
                {nextLabel && (
                  <div className="flex justify-end pt-3"><button onClick={() => advance(o)} className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 rounded-lg text-sm sm:text-xs font-semibold text-white" style={{ background: '#3d5c3a' }}>{nextLabel}</button></div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
