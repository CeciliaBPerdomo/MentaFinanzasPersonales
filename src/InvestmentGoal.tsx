import { useState } from 'react'
import type { FormEvent } from 'react'
import { ChartNoAxesCombined, LoaderCircle, Save } from 'lucide-react'
import { supabase } from './lib/supabase'

type Props = {
  goal?: { id: string; saved: number; target: number }
  money: (amount: number, currency?: string) => string
  onSaved: () => void
}

export default function InvestmentGoal({ goal, money, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const saved = goal ? Number(goal.saved) : 781.63
  const target = 1000

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy) return
    const balance = Number(new FormData(event.currentTarget).get('balance'))
    if (!Number.isFinite(balance) || balance < 0 || balance > 100000000) return
    setBusy(true)
    setError('')
    try {
      const values = { name: 'Inversiones', saved: balance, target, currency: 'USD' }
      const request = goal ? supabase.from('goals').update(values).eq('id', goal.id) : supabase.from('goals').insert(values)
      const { error: saveError } = await request.select('id').single()
      if (saveError) throw saveError
      setEditing(false)
      onSaved()
    } catch {
      setError('No se pudo confirmar el guardado. Actualiza los datos antes de repetirlo.')
    } finally { setBusy(false) }
  }

  return <article className="min-w-0 rounded-lg border border-line bg-white p-4">
    <div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-mint"><ChartNoAxesCombined size={17} /></span><div><h3 className="text-sm font-semibold">Inversiones</h3><p className="mt-1 text-xs text-muted">Meta {money(target, 'USD')}</p></div></div>
    <p className="mt-4 text-sm">Saldo actual: <strong className="font-semibold">{money(saved, 'USD')}</strong></p>
    <progress aria-label="Meta de inversiones" max={target} value={saved} className="mt-3 h-2 w-full accent-[#79bca2]" />
    <p className="mt-2 text-right text-xs font-semibold text-[#bd3535]">Faltan {money(Math.max(0, target - saved), 'USD')}</p>
    {editing || !goal ? <form onSubmit={save} className="mt-4"><label className="block text-xs font-medium">Saldo de inversiones (u$s)<input name="balance" type="number" required min="0" max="100000000" step="0.01" defaultValue={saved} disabled={busy} className="mt-2 w-full min-w-0 rounded-lg border border-line bg-paper px-3 py-2 text-base" /></label><div className="mt-3 flex flex-wrap gap-3"><button disabled={busy} type="submit" className="flex items-center gap-2 rounded-lg bg-[#293e31] px-3 py-2 text-xs text-white">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}{busy ? 'Guardando…' : goal ? 'Guardar saldo' : 'Guardar meta'}</button>{goal && <button type="button" disabled={busy} onClick={() => setEditing(false)} className="px-2 py-2 text-xs text-muted">Cancelar</button>}</div></form> : <button onClick={() => setEditing(true)} className="mt-3 py-2 text-xs text-[#355c48] underline underline-offset-4">Actualizar saldo</button>}
    {error && <p role="alert" className="mt-3 text-xs text-[#b4452d]">{error}</p>}
  </article>
}