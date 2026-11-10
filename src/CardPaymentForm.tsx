import { useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, Save } from 'lucide-react'
import { supabase } from './lib/supabase'

type Account = { id: string; institution: string; kind: string; currency: string; opening_date: string }
type Props = { accounts: Account[]; ready: boolean; currency: string; today: string; onSaved: () => void; onBusyChange: (busy: boolean) => void }
const label = (account: Account) => `${account.institution === 'BBVA' && account.kind === 'credit' ? 'Visa BBVA' : account.institution} · ${account.currency === 'UYU' ? '$ Pesos' : 'u$s Dólares'}`

export default function CardPaymentForm({ accounts, ready, currency, today, onSaved, onBusyChange }: Props) {
  const banks = accounts.filter(account => account.kind === 'cash' && account.opening_date <= today)
  const initialBank = banks.find(bank => bank.currency === currency) ?? banks[0]
  const [sourceId, setSourceId] = useState(initialBank?.id ?? '')
  const [cardId, setCardId] = useState(() => accounts.find(account => account.kind === 'credit' && account.currency === initialBank?.currency && account.opening_date <= today)?.id ?? '')
  const [requestId] = useState(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const source = banks.find(bank => bank.id === sourceId)
  const cards = accounts.filter(account => account.kind === 'credit' && account.currency === source?.currency && account.opening_date <= today)
  const card = cards.find(account => account.id === cardId)
  const minDate = source && card ? [source.opening_date, card.opening_date].sort().at(-1) : undefined
  const inputStyle = 'mt-2 w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2.5 text-base'

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy || !source || !card || !ready) return
    const form = new FormData(event.currentTarget)
    const amount = Number(form.get('amount'))
    const date = String(form.get('date'))
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000 || !date || date < (minDate ?? '') || date > today) {
      setError('Revisa el importe y la fecha del pago.')
      return
    }
    setBusy(true)
    onBusyChange(true)
    setError('')
    try {
      const { error: saveError } = await supabase.from('card_payments').insert({ id: requestId, source_account_id: source.id, card_account_id: card.id, currency: source.currency, amount, occurred_on: date }).select('id').single()
      if (saveError) throw saveError
      onSaved()
    } catch {
      setError('No se pudo confirmar el pago. Cierra y actualiza los datos antes de volver a intentarlo para evitar duplicados.')
    } finally { setBusy(false); onBusyChange(false) }
  }

  return <form onSubmit={save} className="mt-4">
    {!ready && <p role="alert" className="mb-4 text-sm text-[#b4452d]">Ejecuta card-payments.sql en Supabase y actualiza los datos para habilitar los pagos.</p>}
    <fieldset disabled={busy || !ready} className="space-y-4 disabled:opacity-50">
      <label className="block text-sm">Cuenta de origen y moneda<select required value={sourceId} onChange={event => { setSourceId(event.target.value); setCardId('') }} className={inputStyle}><option value="" disabled>Seleccionar cuenta</option>{banks.map(bank => <option key={bank.id} value={bank.id}>{label(bank)}</option>)}</select></label>
      <label className="block text-sm">Tarjeta a pagar<select required value={cardId} onChange={event => setCardId(event.target.value)} className={inputStyle}><option value="" disabled>Seleccionar tarjeta</option>{cards.map(item => <option key={item.id} value={item.id}>{label(item)}</option>)}</select></label>
      {source && cards.length === 0 && <p className="text-xs text-[#b4452d]">No hay tarjetas registradas en esta moneda.</p>}
      <label className="block text-sm">Importe ({source?.currency === 'USD' ? 'u$s' : '$'})<input name="amount" type="number" min="0.01" max="100000000" step="0.01" required className={inputStyle} /></label>
      <label className="block text-sm">Fecha del pago<input name="date" type="date" min={minDate} max={today} defaultValue={today} required className={inputStyle} /></label>
      <p className="text-xs leading-relaxed text-muted">El pago descuenta del banco y reduce la deuda, sin sumar otro gasto. Ambas cuentas deben tener la misma moneda. Menta registra el pago; no envía dinero.</p>
      <button type="submit" disabled={!card} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#293e31] px-4 py-3 text-sm text-white disabled:opacity-40">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{busy ? 'Guardando…' : 'Guardar pago'}</button>
    </fieldset>{error && <p role="alert" className="mt-4 text-sm text-[#b4452d]">{error}</p>}
  </form>
}