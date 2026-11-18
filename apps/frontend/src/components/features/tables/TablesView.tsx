'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { errorMessage } from '@/services/http'
import { listTables } from '@/services/tables'
import type { Table } from '@/types/api'
import { money } from '@/lib/format'
import { POLL_MS } from '@/constants'
import { useSession } from '@/hooks/useSession'
import { usePolling } from '@/hooks/usePolling'
import PageTitle from '@/components/ui/PageTitle'
import StatTile from '@/components/ui/StatTile'
import Skeleton from '@/components/ui/Skeleton'
import OpenTableDialog from './OpenTableDialog'
import OrdersDialog from './OrdersDialog'
import AddItemsDialog from './AddItemsDialog'
import TableAccountDialog from './TableAccountDialog'

type Modal = { kind: 'open' } | { kind: 'orders' | 'addItems' | 'account'; table: Table } | null

// Salão: mesas abertas, pedidos e fechamento de conta (garçom, gerente e admin)
export default function TablesView() {
  const { user } = useSession()
  const isManager = user.role !== 'GARCOM'
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)

  const load = useCallback(async () => {
    try {
      setTables(await listTables())
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar mesas'))
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  // Pausa com diálogo aberto: a lista não muda embaixo de quem está lançando
  usePolling(load, POLL_MS, { enabled: modal === null })

  const occupied = tables.filter((t) => t.status === 'OCCUPIED')

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageTitle title="Mesas" subtitle={isManager ? 'Mesas em funcionamento e fechamento de contas' : 'Mesas em funcionamento'} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <StatTile label="Mesas ocupadas" value={occupied.length} color="#c45c2a" />
        {isManager
          ? <StatTile label="Em aberto (com taxa)" value={money(occupied.reduce((s, t) => s + t.total, 0))} color="#3d5c3a" />
          : <StatTile label="Pedidos não entregues" value={occupied.reduce((s, t) => s + t.undelivered, 0)} color="#3d5c3a" />}
        <StatTile label="Mesas livres" value={tables.filter((t) => t.status === 'FREE').length} color="#6b5a4a" />
      </div>
      <button onClick={() => setModal({ kind: 'open' })} className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold" style={{ background: '#3d5c3a', color: '#faf6ef' }}>Abrir mesa</button>

      {loading ? <Skeleton /> : occupied.length === 0 ? (
        <div className="rounded-2xl py-12 text-center" style={{ background: '#fff9f2', border: '1px solid #d9cfc2' }}><p className="text-[#6b5a4a]">Nenhuma mesa aberta no momento</p></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {occupied.map((t) => (
            <article key={t.id} className="rounded-2xl p-3 sm:p-4 flex flex-col gap-2 min-w-0" style={{ background: 'rgba(196,92,42,0.05)', border: '1.5px solid #c45c2a' }}>
              <div className="flex flex-wrap justify-between items-start gap-1">
                <div className="min-w-0"><p className="text-xs" style={{ color: '#6b5a4a' }}>Mesa</p><h2 className="text-xl sm:text-2xl font-bold text-[#2a1f14] leading-none break-words" style={{ fontFamily: 'Georgia, serif' }}>{t.identifier}</h2></div>
                {t.inKitchen > 0 && <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'rgba(232,160,74,0.2)', color: '#7a4a0e' }}>{t.inKitchen} na cozinha</span>}
              </div>
              {t.clientName && <p className="text-xs px-2 py-1 rounded-lg truncate" style={{ background: 'rgba(232,160,74,0.15)', color: '#7a4a0e' }}>{t.clientName}</p>}
              <p className="text-sm font-semibold" style={{ color: '#c45c2a' }}>{money(t.total)} <span className="text-xs font-normal" style={{ color: '#6b5a4a' }}>com taxa</span></p>
              <div className="flex gap-1 mt-1">
                <button onClick={() => setModal({ kind: 'orders', table: t })} className="flex-1 py-2 sm:py-1.5 rounded-xl text-xs font-semibold" style={{ background: '#c45c2a', color: '#faf6ef' }}>Pedidos</button>
                <button onClick={() => setModal({ kind: 'account', table: t })} className="flex-1 py-2 sm:py-1.5 rounded-xl text-xs font-semibold" style={{ background: '#3d5c3a', color: '#faf6ef' }}>Conta</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal?.kind === 'open' && <OpenTableDialog onClose={() => setModal(null)} onOpened={load} />}

      {modal?.kind === 'orders' && (
        <OrdersDialog
          table={modal.table}
          onClose={() => setModal(null)}
          onAddItems={() => setModal({ kind: 'addItems', table: modal.table })}
          onChanged={load}
        />
      )}

      {modal?.kind === 'addItems' && (
        <AddItemsDialog
          tableId={modal.table.id}
          tableIdentifier={modal.table.identifier}
          onClose={() => setModal({ kind: 'orders', table: modal.table })}
          onSuccess={load}
        />
      )}

      {modal?.kind === 'account' && (
        <TableAccountDialog table={modal.table} onClose={() => setModal(null)} onClosed={() => { setModal(null); load() }} />
      )}
    </div>
  )
}
