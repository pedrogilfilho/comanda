'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ORDER_STATUS_LABEL, canTransition } from '@comanda/shared'
import { errorMessage } from '@/services/http'
import { getTableAccount, updateOrderStatus } from '@/services/orders'
import type { OrderView, Table, TableAccount } from '@/types/api'
import { money, weight, time } from '@/lib/format'
import { useSession } from '@/hooks/useSession'
import Dialog from '@/components/ui/Dialog'
import ConfirmModal from '@/components/ui/ConfirmModal'
import Skeleton from '@/components/ui/Skeleton'

interface OrdersDialogProps {
  table: Table
  onClose: () => void
  onAddItems: () => void
  onChanged: () => void // algo mudou na mesa (ex.: pedido cancelado)
}

export default function OrdersDialog({ table, onClose, onAddItems, onChanged }: OrdersDialogProps) {
  const { user } = useSession()
  const canCancel = user.role === 'GERENTE' || user.role === 'ADMIN'
  const [account, setAccount] = useState<TableAccount | null>(null)
  const [toCancel, setToCancel] = useState<OrderView | null>(null)
  const [reason, setReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    try {
      setAccount(await getTableAccount(table.id))
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao carregar pedidos'))
    }
  }, [table.id])

  useEffect(() => {
    load()
  }, [load])

  const confirmCancel = async () => {
    if (!toCancel) return
    setCancelling(true)
    try {
      await updateOrderStatus(toCancel.id, 'CANCELLED', reason.trim() || undefined)
      toast.success('Pedido cancelado e estoque devolvido')
      setToCancel(null)
      setReason('')
      await load()
      onChanged()
    } catch (e) {
      toast.error(errorMessage(e, 'Erro ao cancelar o pedido'))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <Dialog
        title={`Pedidos · Mesa ${table.identifier}`}
        onClose={onClose}
        footer={<button onClick={onAddItems} className="w-full py-3 rounded-lg font-semibold text-white" style={{ background: '#c45c2a' }}>Adicionar itens</button>}
      >
        {!account ? <Skeleton className="h-24 rounded-xl" /> : account.orders.length === 0 ? (
          <p className="text-center py-6 text-[#6b5a4a]">Nenhum pedido lançado ainda</p>
        ) : (
          <ul className="space-y-3">
            {account.orders.map((o) => (
              <li key={o.id} className="p-3 rounded-lg border" style={{ borderColor: '#e8ddd2' }}>
                <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'rgba(61,92,58,0.15)', color: '#3d5c3a' }}>{ORDER_STATUS_LABEL[o.status] ?? o.status} · {time(o.createdAt)}</span>
                  <span className="text-sm font-semibold" style={{ color: '#c45c2a' }}>{money(o.subtotal)}</span>
                </div>
                {o.items.map((it) => (
                  <p key={it.id} className="text-sm text-[#2a1f14]">• {it.productName} {it.isMeat ? weight(it.quantity) : `x${it.quantity}`}: {money(it.subtotal)}{it.notes && <span className="text-xs italic" style={{ color: '#9a5f14' }}> · {it.notes}</span>}</p>
                ))}
                {canCancel && canTransition(o.status, 'CANCELLED') && (
                  <div className="flex justify-end pt-2">
                    <button onClick={() => { setReason(''); setToCancel(o) }} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#b03a2e', background: 'rgba(176,58,46,0.08)' }}>Cancelar pedido</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      {toCancel && (
        <ConfirmModal
          title="Cancelar pedido"
          message={<>O pedido de {time(toCancel.createdAt)} ({money(toCancel.subtotal)}) sai da conta e os itens voltam para o estoque.</>}
          confirmLabel="Cancelar pedido"
          tone="danger"
          loading={cancelling}
          onConfirm={confirmCancel}
          onCancel={() => setToCancel(null)}
        >
          <label htmlFor="cancel-reason" className="block text-xs font-medium mb-1">Motivo (opcional)</label>
          <input id="cancel-reason" value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-[#2a1f14]" style={{ borderColor: '#d9cfc2' }} placeholder="Ex: cliente desistiu" />
        </ConfirmModal>
      )}
    </>
  )
}
