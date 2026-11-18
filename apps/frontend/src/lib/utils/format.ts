import { PRODUCT_CATEGORIES, type PaymentMethod } from '@comanda/shared'

// Rótulos e regras de preço vêm do @comanda/shared (mesma fonte do backend)
export { ROLE_LABEL, CATEGORY_LABEL, PAYMENT_LABEL, ORDER_STATUS_LABEL, meatSubtotal } from '@comanda/shared'

export const CATEGORY_ORDER = PRODUCT_CATEGORIES

// Ícone ao lado do nome da forma de pagamento (só visual)
export const PAYMENT_ICON: Record<PaymentMethod, string> = {
  DINHEIRO: '💵',
  PIX: '⚡',
  DEBITO: '💳',
  CREDITO: '💳',
}

export const money = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Gramas → "350 g" ou "1,25 kg"
export const weight = (grams: number) =>
  grams >= 1000 ? `${(grams / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg` : `${grams} g`

// "R$ 12,50" / "12,5" / "12.50" → centavos (NaN se inválido)
export const toCents = (value: string) => {
  const v = value.trim().replace(/[R$\s]/g, '')
  const normalized = v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v
  return Math.round(parseFloat(normalized) * 100)
}

// Centavos → "12,50" (para preencher inputs)
export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',')

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Data de hoje (fuso do navegador) no formato AAAA-MM-DD, para inputs type="date"
export const todayISO = () => isoDay(new Date())

export const daysAgoISO = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return isoDay(d)
}

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
