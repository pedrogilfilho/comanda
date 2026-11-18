'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { NEXT_ORDER_STATUS, ORDER_STATUS_LABEL, TABLE_IDENTIFIER_MAX_LENGTH, canTransition, type OrderStatus } from '@comanda/shared'
import { errorMessage } from '@/lib/api/http'
import { listUsers, AppUser } from '@/lib/api/users'
import { listProducts, Product } from '@/lib/api/products'
import { listTables, openTable, Table } from '@/lib/api/tables'
import { getTableAccount, listKitchenOrders, updateOrderStatus, TableAccount, KitchenOrder, OrderView } from '@/lib/api/orders'
import { money, weight, time } from '@/lib/utils/format'
import { useSession } from '@/hooks/useSession'
import { usePolling } from '@/hooks/usePolling'
import AddItemsModal from '@/components/AddItemsModal'
import TableAccountModal from '@/components/TableAccountModal'
import Dialog from '@/components/ui/Dialog'
import ConfirmModal from '@/components/ui/ConfirmModal'
import UsersTab from '@/components/admin/UsersTab'
import MenuTab from '@/components/admin/MenuTab'
import StockTab from '@/components/admin/StockTab'
import ReportsTab from '@/components/admin/ReportsTab'
import LogsTab from '@/components/admin/LogsTab'
import ClosedAccountsTab from '@/components/admin/ClosedAccountsTab'

const POLL_MS = 15_000 // cozinha e salão atualizam sozinhos

// Botão da cozinha para o próximo passo do pedido
const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING: 'Iniciar preparo',
  PREPARING: 'Marcar pronto',
  READY: 'Marcar entregue',
}

const card = { background: '#fff9f2', border: '1px solid #d9cfc2' }
const Title = ({ t, s }: { t: string; s: string }) => (
  <div>
    <h1 className="text-2xl sm:text-4xl font-bold text-[#2a1f14]" style={{ fontFamily: 'Georgia, serif' }}>{t}</h1>
    <p className="text-sm sm:text-base text-[#6b5a4a] mt-1 sm:mt-2">{s}</p>
  </div>
)
const Stat = ({ label, value, color }: { label: string; value: React.ReactNode; color: string }) => (
  <div className="rounded-2xl px-4 py-3 sm:p-5 flex items-center justify-between gap-3 sm:block" style={card}>
    <p className="text-xs font-medium" style={{ color: '#6b5a4a' }}>{label}</p>
    <p className="text-xl sm:text-3xl font-bold sm:mt-2 whitespace-nowrap" style={{ color, fontFamily: 'Georgia, serif' }}>{value}</p>
  </div>
)
const Skeleton = () => <div className="h-32 rounded-2xl animate-pulse" style={{ background: '#f5f0eb' }} />

export default function DashboardPage() {
  const { user } = useSession()
  const role = user.role
  const canCancel = role === 'GERENTE' || role === 'ADMIN'

  const [users, setUsers] = useState<AppUser[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [kitchen, setKitchen] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'menu' | 'stock' | 'closed' | 'reports' | 'logs'>('users')
  const [managerTab, setManagerTab] = useState<'tables' | 'closed' | 'reports'>('tables')

  const [showOpen, setShowOpen] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [clientName, setClientName] = useState('')
  const [opening, setOpening] = useState(false)
  const [selected, setSelected] = useState<Table | null>(null)
  const [modal, setModal] = useState<'orders' | 'account' | 'addItems' | null>(null)
  const [account, setAccount] = useState<TableAccount | null>(null)
  const [toCancel, setToCancel] = useState<OrderView | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const safe = async (fn: () => Promise<void>, msg: string) => {
    try { await fn() } catch (e) { toast.error(errorMessage(e, msg)) }
  }

  const loadAdmin = useCallback(() => safe(async () => {
    const [u, p, t] = await Promise.all([listUsers(), listProducts(), listTables()])
    setUsers(u); setProducts(p); setTables(t)
  }, 'Erro ao carregar o painel'), [])
  const loadTables = useCallback(() => safe(async () => setTables(await listTables()), 'Erro ao carregar mesas'), [])
  const loadKitchen = useCallback(() => safe(async () => setKitchen(await listKitchenOrders()), 'Erro ao carregar a fila'), [])
  const load = role === 'ADMIN' ? loadAdmin : role === 'COZINHA' ? loadKitchen : loadTables

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  // Pausa com a aba escondida e com diálogo aberto (a lista não muda embaixo de quem está lançando)
  const dialogOpen = showOpen || modal !== null || toCancel !== null
  usePolling(load, POLL_MS, { enabled: role !== 'ADMIN' && !dialogOpen })

  const occupied = tables.filter((t) => t.status === 'OCCUPIED')

  const handleOpen = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!identifier.trim()) { toast.error('Informe o número ou identificador da mesa'); return }
    setOpening(true)
    await safe(async () => {
      await openTable({ identifier: identifier.trim(), clientName: clientName.trim() || undefined })
      toast.success(`Mesa ${identifier.trim()} aberta`)
      setShowOpen(false); setIdentifier(''); setClientName('')
      await loadTables()
    }, 'Erro ao abrir mesa')
    setOpening(false)
  }

  const openOrders = async (t: Table) => {
    setSelected(t); setModal('orders'); setAccount(null)
    await safe(async () => setAccount(await getTableAccount(t.id)), 'Erro ao carregar pedidos')
  }

  const confirmCancel = async () => {
    if (!toCancel || !selected) return
    setCancelling(true)
    await safe(async () => {
      await updateOrderStatus(toCancel.id, 'CANCELLED', cancelReason.trim() || undefined)
      toast.success('Pedido cancelado e estoque devolvido')
      setToCancel(null); setCancelReason('')
      setAccount(await getTableAccount(selected.id))
      await loadTables()
    }, 'Erro ao cancelar o pedido')
    setCancelling(false)
  }

  // ============ ADMIN ============
  if (role === 'ADMIN') {
    const lowCount = products.filter((p) => p.lowStock).length
    const TABS = [
      { k: 'users', l: '👥 Usuários' }, { k: 'menu', l: '🍽️ Cardápio' }, { k: 'stock', l: '📦 Estoque' },
      { k: 'closed', l: '🧾 Mesas fechadas' }, { k: 'reports', l: '📊 Relatórios' }, { k: 'logs', l: '📋 Logs' },
    ] as const
    return (
      <div className="space-y-5 sm:space-y-6">
        <Title t="Painel de administração" s="Usuários, cardápio, estoque, relatórios e sistema" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <Stat label="Usuários ativos" value={users.filter((u) => u.active).length} color="#c45c2a" />
          <Stat label="Mesas ocupadas" value={occupied.length} color="#3d5c3a" />
          <Stat label="Itens no cardápio" value={products.length} color="#2a1f14" />
        </div>
        {lowCount > 0 && (
          <button onClick={() => setTab('stock')} className="w-full text-left rounded-2xl p-4 flex items-center gap-3" style={{ background: 'rgba(176,58,46,0.07)', border: '1px solid rgba(176,58,46,0.3)' }}>
            <span className="text-2xl" aria-hidden>⚠️</span>
            <div><p className="text-xs font-semibold" style={{ color: '#b03a2e' }}>Estoque baixo</p><p className="text-2xl font-bold" style={{ color: '#b03a2e', fontFamily: 'Georgia, serif' }}>{lowCount} {lowCount === 1 ? 'item' : 'itens'}</p></div>
          </button>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" role="tablist" aria-label="Seções do painel">
          {TABS.map((x) => (
            <button key={x.k} role="tab" aria-selected={tab === x.k} onClick={() => setTab(x.k)} className="py-2.5 sm:py-3 px-1 rounded-xl font-semibold text-sm" style={{ background: tab === x.k ? '#c45c2a' : '#fff9f2', color: tab === x.k ? '#faf6ef' : '#2a1f14', border: '1px solid ' + (tab === x.k ? '#c45c2a' : '#d9cfc2') }}>{x.l}</button>
          ))}
        </div>
        {tab === 'users' && <UsersTab users={users} loading={loading} currentUserId={user.id} onChange={loadAdmin} />}
        {tab === 'menu' && <MenuTab products={products} loading={loading} onChange={loadAdmin} />}
        {tab === 'stock' && <StockTab products={products} loading={loading} onChange={loadAdmin} />}
        {tab === 'closed' && <ClosedAccountsTab />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'logs' && <LogsTab />}
      </div>
    )
  }

  // ============ COZINHA ============
  if (role === 'COZINHA') {
    const advance = (o: KitchenOrder) => {
      const next = NEXT_ORDER_STATUS[o.status]
      if (!next || next === 'PENDING' || next === 'CLOSED') return
      return safe(async () => { await updateOrderStatus(o.id, next); await loadKitchen() }, 'Erro ao atualizar status')
    }
    return (
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Title t="Fila de pedidos" s="Pedidos aguardando preparo" />
          <button onClick={loadKitchen} className="px-4 py-2 rounded-xl font-semibold text-sm" style={{ background: '#f0ebe4', color: '#6b5a4a' }}>Atualizar</button>
        </div>
        {loading ? <Skeleton /> : kitchen.length === 0 ? (
          <p className="text-center py-12 text-lg text-[#6b5a4a]">Nenhum pedido no momento</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {kitchen.map((o) => {
              const hot = o.status === 'PREPARING'
              const nextLabel = NEXT_LABEL[o.status]
              return (
                <article key={o.id} className="rounded-2xl p-4" style={{ background: hot ? 'rgba(196,92,42,0.08)' : o.status === 'READY' ? 'rgba(61,92,58,0.08)' : '#fff9f2', border: `1.5px solid ${hot ? '#c45c2a' : o.status === 'READY' ? '#3d5c3a' : '#d9cfc2'}` }}>
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

  const isManager = role === 'GERENTE'

  // ============ GERENTE: abas extras ============
  if (isManager && managerTab !== 'tables') {
    return (
      <div className="space-y-5 sm:space-y-6">
        <ManagerTabs value={managerTab} onChange={setManagerTab} />
        {managerTab === 'closed' ? <ClosedAccountsTab /> : <ReportsTab />}
      </div>
    )
  }

  // ============ GARÇOM / GERENTE ============
  return (
    <div className="space-y-5 sm:space-y-6">
      {isManager && <ManagerTabs value={managerTab} onChange={setManagerTab} />}
      <Title t="Mesas" s={isManager ? 'Mesas em funcionamento e fechamento de contas' : 'Mesas em funcionamento'} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <Stat label="Mesas ocupadas" value={occupied.length} color="#c45c2a" />
        {isManager
          ? <Stat label="Em aberto (com taxa)" value={money(occupied.reduce((s, t) => s + t.total, 0))} color="#3d5c3a" />
          : <Stat label="Pedidos não entregues" value={occupied.reduce((s, t) => s + t.undelivered, 0)} color="#3d5c3a" />}
        <Stat label="Mesas livres" value={tables.filter((t) => t.status === 'FREE').length} color="#6b5a4a" />
      </div>
      <button onClick={() => setShowOpen(true)} className="w-full sm:w-auto px-6 py-3 rounded-xl font-semibold" style={{ background: '#3d5c3a', color: '#faf6ef' }}>Abrir mesa</button>

      {loading ? <Skeleton /> : occupied.length === 0 ? (
        <div className="rounded-2xl py-12 text-center" style={card}><p className="text-[#6b5a4a]">Nenhuma mesa aberta no momento</p></div>
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
                <button onClick={() => openOrders(t)} className="flex-1 py-2 sm:py-1.5 rounded-xl text-xs font-semibold" style={{ background: '#c45c2a', color: '#faf6ef' }}>Pedidos</button>
                <button onClick={() => { setSelected(t); setModal('account') }} className="flex-1 py-2 sm:py-1.5 rounded-xl text-xs font-semibold" style={{ background: '#3d5c3a', color: '#faf6ef' }}>Conta</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showOpen && (
        <Dialog title="Abrir mesa" size="sm" onClose={() => setShowOpen(false)} dismissible={!opening}>
          <form onSubmit={handleOpen} className="space-y-4">
            <div>
              <label htmlFor="table-identifier" className="block text-sm font-medium text-[#6b5a4a] mb-1.5">Número ou nome da mesa</label>
              <input id="table-identifier" autoFocus required maxLength={TABLE_IDENTIFIER_MAX_LENGTH} value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full px-3 py-2 border rounded-lg" style={{ borderColor: '#d9cfc2' }} placeholder="Ex: 5, A3, Varanda" />
            </div>
            <div>
              <label htmlFor="table-client" className="block text-sm font-medium text-[#6b5a4a] mb-1.5">Nome do cliente <span className="font-normal">(opcional)</span></label>
              <input id="table-client" maxLength={80} value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" style={{ borderColor: '#d9cfc2' }} placeholder="Ex: João Silva" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowOpen(false)} disabled={opening} className="flex-1 py-2.5 rounded-lg font-semibold" style={{ background: '#f0ebe4', color: '#6b5a4a' }}>Voltar</button>
              <button type="submit" disabled={opening} className="flex-1 py-2.5 rounded-lg font-semibold text-white" style={{ background: '#c45c2a', opacity: opening ? 0.6 : 1 }}>{opening ? 'Abrindo…' : 'Abrir mesa'}</button>
            </div>
          </form>
        </Dialog>
      )}

      {modal === 'orders' && selected && (
        <Dialog
          title={`Pedidos · Mesa ${selected.identifier}`}
          onClose={() => setModal(null)}
          footer={<button onClick={() => setModal('addItems')} className="w-full py-3 rounded-lg font-semibold text-white" style={{ background: '#c45c2a' }}>Adicionar itens</button>}
        >
          {!account ? <div className="h-24 rounded-xl animate-pulse" style={{ background: '#f5f0eb' }} /> : account.orders.length === 0 ? (
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
                      <button onClick={() => { setCancelReason(''); setToCancel(o) }} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: '#b03a2e', background: 'rgba(176,58,46,0.08)' }}>Cancelar pedido</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Dialog>
      )}

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
          <input id="cancel-reason" value={cancelReason} maxLength={120} onChange={(e) => setCancelReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-[#2a1f14]" style={{ borderColor: '#d9cfc2' }} placeholder="Ex: cliente desistiu" />
        </ConfirmModal>
      )}

      {modal === 'addItems' && selected && (
        <AddItemsModal tableId={selected.id} tableIdentifier={selected.identifier} onClose={() => openOrders(selected)} onSuccess={loadTables} />
      )}

      {modal === 'account' && selected && (
        <TableAccountModal table={selected} onClose={() => setModal(null)} onClosed={() => { setModal(null); setSelected(null); loadTables() }} />
      )}
    </div>
  )
}

function ManagerTabs({ value, onChange }: { value: 'tables' | 'closed' | 'reports'; onChange: (v: 'tables' | 'closed' | 'reports') => void }) {
  const tabs = [
    { k: 'tables', l: '🍽️ Mesas' },
    { k: 'closed', l: '🧾 Mesas fechadas' },
    { k: 'reports', l: '📊 Relatórios' },
  ] as const
  return (
    <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Seções">
      {tabs.map((x) => (
        <button key={x.k} role="tab" aria-selected={value === x.k} onClick={() => onChange(x.k)} className="py-2.5 sm:py-3 px-1 rounded-xl font-semibold text-xs sm:text-sm" style={{ background: value === x.k ? '#c45c2a' : '#fff9f2', color: value === x.k ? '#faf6ef' : '#2a1f14', border: '1px solid ' + (value === x.k ? '#c45c2a' : '#d9cfc2') }}>{x.l}</button>
      ))}
    </div>
  )
}
