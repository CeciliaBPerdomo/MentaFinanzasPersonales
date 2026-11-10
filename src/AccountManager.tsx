import { useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown, CreditCard, Landmark, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react'
import { supabase } from './lib/supabase'

type Account = { id: string; institution: string; kind: 'cash' | 'credit'; currency: string }
type Props = { accounts: Account[]; transactionAccountIds: Array<string | null>; onChanged: () => void }
const label = (account: Account) => `${account.institution === 'BBVA' && account.kind === 'credit' ? 'Visa BBVA' : account.institution} · ${account.currency === 'UYU' ? 'Pesos' : 'Dólares'}`
const dateToday = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

export default function AccountManager({ accounts, transactionAccountIds, onChanged }: Props) {
  const [formKind, setFormKind] = useState<'cash' | 'credit' | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const inputStyle = 'mt-2 w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2.5 text-base'

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy || !formKind) return
    const form = new FormData(event.currentTarget)
    const name = String(form.get('institution') ?? '').trim()
    const currency = String(form.get('currency'))
    const balance = Number(form.get('balance'))
    const openingDate = String(form.get('opening_date'))
    if (!name || name.length > 70 || !['UYU', 'USD'].includes(currency) || !Number.isFinite(balance) || balance < 0 || balance > 100000000 || !openingDate || openingDate > dateToday()) {
      setError('Revisa el nombre, importe, moneda y fecha.')
      return
    }
    const matching = accounts.find(account => account.institution.toLocaleLowerCase() === name.toLocaleLowerCase())
    if (matching && matching.kind !== formKind) {
      setError('Usa un nombre diferente para distinguir la tarjeta de la cuenta bancaria.')
      return
    }
    if (accounts.some(account => account.institution.toLocaleLowerCase() === name.toLocaleLowerCase() && account.currency === currency)) {
      setError('Ya existe una cuenta con ese nombre y moneda.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error: saveError } = await supabase.from('accounts').insert({ institution: matching?.institution ?? name, kind: formKind, currency, opening_balance: formKind === 'credit' ? -balance : balance, opening_date: openingDate }).select('id').single()
      if (saveError) {
        setError(saveError.code === '23505' ? 'La cuenta ya existe. Actualiza los datos.' : 'No se pudo confirmar el guardado. Comprueba que ejecutaste manage-accounts.sql y actualiza antes de repetirlo.')
        return
      }
      setFormKind(null)
      setMessage('Cuenta guardada.')
      onChanged()
    } catch {
      setError('No se pudo confirmar el guardado. Actualiza los datos antes de repetirlo.')
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!supabase || !deleting || busy) return
    setBusy(true)
    setError('')
    try {
      const { error: deleteError } = await supabase.from('accounts').delete().eq('id', deleting.id).select('id').single()
      if (deleteError) {
        setError(deleteError.code === '23503' ? 'Esta cuenta tiene movimientos y no se puede eliminar sin perder su historial.' : 'No se pudo confirmar la eliminación. Actualiza los datos antes de repetirlo.')
        return
      }
      setDeleting(null)
      setMessage('Cuenta eliminada.')
      onChanged()
    } catch {
      setError('No se pudo confirmar la eliminación. Actualiza los datos antes de repetirlo.')
    } finally { setBusy(false) }
  }

  return <section className="border-t border-line bg-paper p-5">
    <details><summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold"><span>Administrar cuentas</span><ChevronDown size={17} /></summary>
      <div className="mt-4 space-y-2">{([{ kind: 'cash', text: 'Agregar cuenta bancaria', icon: Landmark }, { kind: 'credit', text: 'Agregar tarjeta', icon: CreditCard }] as const).map(({ kind, text, icon: Icon }) => <button key={kind} onClick={() => { setError(''); setMessage(''); setFormKind(kind) }} className="flex w-full items-center gap-2 rounded-lg border border-line bg-white p-3 text-left text-xs"><Icon size={16} /><span className="flex-1">{text}</span><Plus size={15} /></button>)}</div>
      <ul className="mt-4 divide-y divide-line">{accounts.map(account => {
        const hasHistory = transactionAccountIds.includes(account.id)
        return <li key={account.id} className="flex items-center justify-between gap-2 py-3"><div className="min-w-0"><p className="wrap-break-word text-xs font-medium">{label(account)}</p><p className="mt-1 text-[10px] text-muted">{hasHistory ? 'Con movimientos · no se puede eliminar' : account.kind === 'credit' ? 'Tarjeta de crédito' : 'Cuenta bancaria'}</p></div><button disabled={hasHistory} title={hasHistory ? 'Cuenta con historial' : 'Eliminar cuenta'} aria-label={`Eliminar ${label(account)}`} onClick={() => { setError(''); setMessage(''); setDeleting(account) }} className="grid size-9 shrink-0 place-items-center rounded-lg text-[#b4452d] hover:bg-[#fce9e5] disabled:opacity-30"><Trash2 size={16} /></button></li>
      })}</ul>
      {message && <p role="status" className="mt-3 text-xs text-[#355c48]">{message}</p>}
    </details>
    {(formKind || deleting) && <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/35 px-5 py-8"><section role="dialog" aria-modal="true" aria-labelledby="account-dialog-title" className="mx-auto w-full max-w-sm rounded-lg bg-paper p-6 shadow-xl"><div className="flex items-center justify-between gap-3"><h2 id="account-dialog-title" className="font-display text-xl">{deleting ? 'Eliminar cuenta' : formKind === 'credit' ? 'Agregar tarjeta' : 'Agregar cuenta bancaria'}</h2><button disabled={busy} aria-label="Cerrar administración" onClick={() => { setFormKind(null); setDeleting(null) }} className="p-2"><X size={18} /></button></div>
      {deleting ? <><p className="mt-4 text-sm font-semibold">{label(deleting)}</p><p className="mt-3 text-sm text-muted">Se eliminará esta cuenta en esta moneda y su saldo inicial. La otra moneda no se modifica. No se puede deshacer.</p><div className="mt-5 flex flex-wrap justify-end gap-3"><button disabled={busy} onClick={() => setDeleting(null)} className="rounded-lg border border-line px-3 py-2 text-sm">Cancelar</button><button disabled={busy} onClick={() => void remove()} className="flex items-center gap-2 rounded-lg bg-[#b4452d] px-3 py-2 text-sm text-white"><Trash2 size={16} />{busy ? 'Eliminando…' : 'Eliminar'}</button></div></> : <form onSubmit={create} className="mt-5"><fieldset disabled={busy} className="space-y-4">
        <label className="block text-sm">{formKind === 'credit' ? 'Nombre de la tarjeta y banco' : 'Nombre del banco o cuenta'}<input name="institution" required maxLength={70} placeholder={formKind === 'credit' ? 'Ej.: Mastercard Itaú' : 'Ej.: Santander'} className={inputStyle} /></label>
        <label className="block text-sm">Moneda<select name="currency" className={inputStyle}><option value="UYU">Pesos uruguayos ($)</option><option value="USD">Dólares (u$s)</option></select></label>
        <label className="block text-sm">{formKind === 'credit' ? 'Deuda inicial (importe positivo)' : 'Saldo inicial'}<input name="balance" type="number" min="0" max="100000000" step="0.01" required defaultValue="0" className={inputStyle} /></label>
        <label className="block text-sm">Fecha del saldo<input name="opening_date" type="date" required max={dateToday()} defaultValue={dateToday()} className={inputStyle} /></label>
        {formKind === 'credit' && <p className="text-xs leading-relaxed text-muted">No introduzcas números de tarjeta ni CVV. Las tarjetas nuevas admiten compras en un pago; sus cierres y cuotas aún no están configurados.</p>}
        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#293e31] px-4 py-3 text-sm text-white">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{busy ? 'Guardando…' : 'Guardar'}</button>
      </fieldset></form>}
      {error && <p role="alert" className="mt-4 text-sm text-[#b4452d]">{error}</p>}
    </section></div>}
  </section>
}