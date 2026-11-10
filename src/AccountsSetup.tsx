import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, Save, RefreshCw } from 'lucide-react'
import { supabase } from './lib/supabase'

type Account = {
  id: string
  institution: 'Prex' | 'BROU' | 'BBVA'
  kind: 'cash' | 'credit'
  currency: 'UYU' | 'USD'
  opening_balance: number
  opening_date: string
}

const accountOptions = (['Prex', 'BROU', 'BBVA'] as const).flatMap(institution =>
  (['UYU', 'USD'] as const).map(currency => ({
    institution,
    currency,
    kind: institution === 'BBVA' ? 'credit' as const : 'cash' as const,
  })),
)

function accountLabel(account: Pick<Account, 'institution' | 'currency'>) {
  return `${account.institution === 'BBVA' ? 'Visa BBVA' : account.institution} · ${account.currency === 'UYU' ? 'Pesos ($)' : 'Dólares (u$s)'}`
}

function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function AccountsSetup() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    async function loadAccounts() {
      setLoading(true)
      setError('')
      try {
        if (!supabase) throw new Error('missing_config')
        const { data, error: loadError } = await supabase.from('accounts')
          .select('id, institution, kind, currency, opening_balance, opening_date')
          .order('institution').order('currency')
        if (loadError) throw loadError
        if (active) setAccounts(data as Account[])
      } catch {
        if (active) setError('No se pudieron cargar las cuentas. Comprueba tu conexión y que la migración esté ejecutada.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadAccounts()
    return () => { active = false }
  }, [attempt])

  const missingAccounts = accountOptions.filter(option => !accounts.some(account => account.institution === option.institution && account.currency === option.currency))

  async function saveAccounts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy || loading || error) return
    const form = new FormData(event.currentTarget)
    const openingDate = String(form.get('opening_date'))
    const rows = missingAccounts.map(account => {
      const amount = Number(form.get(`${account.institution}_${account.currency}`))
      return { ...account, opening_date: openingDate, opening_balance: account.kind === 'credit' ? -amount : amount }
    })
    if (!openingDate || openingDate > today() || rows.some(row => !Number.isFinite(row.opening_balance) || Math.abs(row.opening_balance) > 100000000)) return
    setBusy(true)
    try {
      const { data, error: saveError } = await supabase.from('accounts').insert(rows)
        .select('id, institution, kind, currency, opening_balance, opening_date')
      if (saveError) throw saveError
      setAccounts(previous => [...previous, ...data as Account[]])
      setSaved(true)
    } catch {
      setError('No se pudieron guardar las cuentas. Recarga las cuentas antes de volver a intentarlo; puede que ya existan.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="accounts-heading" className="mb-8 border-b border-line pb-7">
      <h2 id="accounts-heading" className="font-display text-2xl">Tus cuentas y saldos iniciales</h2>
      {loading ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted"><LoaderCircle size={16} className="animate-spin" /> Cargando cuentas…</p> : error ? <div role="alert" className="mt-4 text-sm text-[#b4452d]"><p>{error}</p><button onClick={() => setAttempt(value => value + 1)} className="mt-3 flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-ink"><RefreshCw size={15} /> Recargar cuentas</button></div> : <>
        {saved && <p role="status" className="mt-3 text-sm text-[#355c48]">Tus cuentas se guardaron en Supabase.</p>}
        {accounts.length > 0 && <ul className="mt-4 divide-y divide-line">{accounts.map(account => <li key={account.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p className="font-medium">{accountLabel(account)}</p><p className="mt-1 text-xs text-muted">{account.kind === 'credit' ? 'Deuda inicial' : 'Saldo inicial'} · {new Date(`${account.opening_date}T12:00:00`).toLocaleDateString('es-UY')}</p></div><strong className="font-semibold">{account.currency === 'UYU' ? '$' : 'u$s'} {new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.kind === 'credit' ? -Number(account.opening_balance) : Number(account.opening_balance))}</strong></li>)}</ul>}
        {missingAccounts.length > 0 && <form onSubmit={saveAccounts} className="mt-4">
          <p className="mb-4 text-sm leading-relaxed text-muted">Indica cuánto tienes en cada cuenta y cuánto debes en Visa a la fecha elegida. No incluyas límites de crédito. Usa 0 si no hay saldo o deuda.</p>
          <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
            <label className="block text-sm font-medium">Fecha de los saldos<input name="opening_date" type="date" required max={today()} defaultValue={today()} className="mt-2 block max-w-full rounded-lg border border-line bg-white px-3 py-2" /></label>
            <div className="grid gap-4 sm:grid-cols-2">{missingAccounts.map(account => <label key={`${account.institution}_${account.currency}`} className="block min-w-0 text-sm font-medium">{accountLabel(account)}<span className="mt-1 block text-xs font-normal text-muted">{account.kind === 'credit' ? 'Deuda pendiente (importe positivo)' : 'Dinero disponible'}</span><input aria-label={accountLabel(account)} name={`${account.institution}_${account.currency}`} type="number" min="0" max="100000000" step="0.01" required defaultValue="0" className="mt-2 w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2.5 text-base" /></label>)}</div>
            <button type="submit" className="flex min-h-11 items-center gap-2 rounded-lg bg-[#293e31] px-4 py-3 text-sm text-white">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{busy ? 'Guardando…' : 'Guardar saldos iniciales'}</button>
          </fieldset>
        </form>}
      </>}
      <p className="mt-5 border-l-2 border-coral pl-3 text-xs leading-relaxed text-muted">Esta sección guarda tus cuentas reales. El resumen y los movimientos todavía muestran datos de ejemplo y no actualizan estos saldos iniciales.</p>
    </section>
  )
}