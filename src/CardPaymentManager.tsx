import { useState } from 'react'
import { CreditCard, Trash2, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import type { CardPayment } from './lib/cardPayments'

type Account = { id: string; institution: string; kind: string; currency: string; opening_date: string }
type Props = { accounts: Account[]; payment: CardPayment; money: (amount: number, unit?: string) => string; onChanged: () => void }

export default function CardPaymentMovement({ accounts, payment, money, onChanged }: Props) {
  const [deleting, setDeleting] = useState<CardPayment | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove() {
    if (!supabase || !deleting || busy) return
    setBusy(true)
    setError('')
    try {
      const { error: deleteError } = await supabase.from('card_payments').delete().eq('id', deleting.id).select('id').single()
      if (deleteError) throw deleteError
      setDeleting(null)
      onChanged()
    } catch {
      setError('No se pudo confirmar la eliminación. Actualiza los datos antes de repetirlo.')
    } finally { setBusy(false) }
  }

  return <article className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-3">
    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-mint"><CreditCard size={17} /></span>
    <div className="min-w-0 flex-1"><h3 className="wrap-break-word text-sm font-medium">Pago de tarjeta</h3><p className="mt-1 text-[11px] text-muted">{accounts.find(account => account.id === payment.source_account_id)?.institution ?? 'Banco'} → {accounts.find(account => account.id === payment.card_account_id)?.institution ?? 'Tarjeta'} · {new Date(`${payment.occurred_on}T12:00:00`).toLocaleDateString('es-UY')}</p></div>
    <strong className="text-xs font-semibold">−{money(Number(payment.amount), payment.currency)}</strong><button title="Eliminar pago" aria-label={`Eliminar pago del ${payment.occurred_on}`} onClick={() => { setError(''); setDeleting(payment) }} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-[#fce9e5]"><Trash2 size={16} /></button>
    {deleting && <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/35 px-5 py-8"><section role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title" className="mx-auto w-full max-w-md rounded-lg bg-paper p-6 shadow-xl"><div className="flex items-center justify-between gap-3"><h2 id="payment-dialog-title" className="font-display text-xl">Eliminar pago</h2><button disabled={busy} aria-label="Cerrar pago de tarjeta" onClick={() => setDeleting(null)} className="p-2"><X size={20} /></button></div>
      <p className="mt-4 text-sm">{money(Number(deleting.amount), deleting.currency)}</p><p className="mt-3 text-sm text-muted">Se devolverá el importe al saldo calculado del banco y aumentará nuevamente la deuda calculada de la tarjeta. Las compras y cuotas no se borran. No se puede deshacer.</p><div className="mt-5 flex justify-end gap-3"><button disabled={busy} onClick={() => setDeleting(null)} className="rounded-lg border border-line px-3 py-2 text-sm">Cancelar</button><button disabled={busy} onClick={() => void remove()} className="rounded-lg bg-[#b4452d] px-3 py-2 text-sm text-white">{busy ? 'Eliminando…' : 'Eliminar pago'}</button></div>
      {error && <p role="alert" className="mt-4 text-sm text-[#b4452d]">{error}</p>}
    </section></div>}
  </article>
}