import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Save, X } from 'lucide-react'
import { supabase } from './lib/supabase'

export default function AddStatement({ onSaved }: { onSaved: (period: string) => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || busy) return
    const form = new FormData(event.currentTarget)
    const closing = String(form.get('closing'))
    const due = String(form.get('due'))
    if (!closing || !due || due <= closing) {
      setError('El vencimiento debe ser posterior al cierre.')
      return
    }
    setBusy(true)
    setError('')
    const period = `${closing.slice(0, 7)}-01`
    try {
      const { error: saveError } = await supabase.from('credit_statements').insert({ period, closing_on: closing, due_on: due }).select('id').single()
      if (saveError) {
        setError(saveError.code === '23505' ? 'Ya existe un cierre para ese mes. No se sobrescribió.' : 'No se pudo confirmar el guardado. Actualiza los datos antes de repetirlo.')
        return
      }
      setOpen(false)
      onSaved(period)
    } catch {
      setError('Comprueba tu conexión. Actualiza los datos antes de repetir el guardado.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <button onClick={() => { setOpen(true); setError('') }} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm"><Plus size={16} /> Agregar cierre</button>
    {open && <div className="fixed inset-0 z-40 overflow-y-auto bg-ink/30 px-5 py-8"><section role="dialog" aria-modal="true" aria-labelledby="statement-title" className="mx-auto w-full max-w-sm rounded-lg bg-paper p-6 shadow-xl"><div className="flex items-center justify-between gap-3"><h2 id="statement-title" className="font-display text-2xl">Agregar cierre Visa</h2><button disabled={busy} aria-label="Cerrar formulario de cierre" onClick={() => setOpen(false)}><X size={20} /></button></div><form onSubmit={save} className="mt-5"><fieldset disabled={busy} className="space-y-4"><label className="block text-sm">Fecha de cierre<input autoFocus type="date" name="closing" required className="mt-2 w-full min-w-0 rounded-lg border border-line bg-white p-3" /></label><label className="block text-sm">Fecha de vencimiento<input type="date" name="due" required className="mt-2 w-full min-w-0 rounded-lg border border-line bg-white p-3" /></label><button type="submit" className="flex items-center gap-2 rounded-lg bg-[#293e31] px-4 py-3 text-sm text-white"><Save size={16} />{busy ? 'Guardando…' : 'Guardar cierre'}</button></fieldset>{error && <p role="alert" className="mt-4 text-sm text-[#b4452d]">{error}</p>}</form></section></div>}
  </>
}