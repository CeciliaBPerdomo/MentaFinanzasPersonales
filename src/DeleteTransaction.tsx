import { useState } from 'react'
import { LoaderCircle, Trash2, X } from 'lucide-react'
import { supabase } from './lib/supabase'

type Props = {
  transaction: { id: string; name: string; installment_count: number }
  amount: string
  onDeleted: () => void
}

export default function DeleteTransaction({ transaction, amount, onDeleted }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove() {
    if (!supabase || busy) return
    setBusy(true)
    setError('')
    try {
      const { data, error: deleteError } = await supabase.from('transactions')
        .delete().eq('id', transaction.id).select('id').single()
      if (deleteError || !data) throw deleteError ?? new Error('not_deleted')
      setOpen(false)
      onDeleted()
    } catch {
      setError('No se pudo confirmar la eliminación. Actualiza los datos antes de volver a intentarlo.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <button type="button" title="Eliminar movimiento" aria-label={`Eliminar movimiento: ${transaction.name}`} onClick={() => { setError(''); setOpen(true) }} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-[#fce9e5] hover:text-[#b4452d]"><Trash2 size={16} /></button>
    {open && <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/35 px-5 py-12">
      <section role="alertdialog" aria-modal="true" aria-labelledby={`delete-title-${transaction.id}`} aria-describedby={`delete-description-${transaction.id}`} className="mx-auto w-full max-w-sm rounded-lg bg-paper p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3"><h2 id={`delete-title-${transaction.id}`} className="font-display text-xl">¿Eliminar movimiento?</h2><button disabled={busy} aria-label="Cerrar confirmación" onClick={() => setOpen(false)} className="p-2"><X size={18} /></button></div>
        <p className="mt-4 wrap-break-word text-sm font-semibold">{transaction.name}</p><p className="mt-1 text-sm">{amount}</p>
        <p id={`delete-description-${transaction.id}`} className="mt-4 text-sm leading-relaxed text-muted">{transaction.installment_count > 1 ? `Se eliminará la compra completa y sus ${transaction.installment_count} cuotas calculadas, no solo la cuota de este mes. ` : ''}Esta acción no se puede deshacer. Los saldos se recalcularán.</p>
        {error && <p role="alert" className="mt-4 text-sm text-[#b4452d]">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3"><button autoFocus disabled={busy} onClick={() => setOpen(false)} className="rounded-lg border border-line px-4 py-2.5 text-sm">Cancelar</button><button disabled={busy} onClick={() => void remove()} className="flex items-center gap-2 rounded-lg bg-[#b4452d] px-4 py-2.5 text-sm text-white disabled:opacity-50">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Trash2 size={16} />}{busy ? 'Eliminando…' : 'Eliminar'}</button></div>
      </section>
    </div>}
  </>
}