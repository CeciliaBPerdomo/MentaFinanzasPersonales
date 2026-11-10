import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { expenseCategories } from './lib/expenseCategories'

import { completeItem, groceryTotal } from './lib/grocery'
import type { GroceryItem } from './lib/grocery'
const emptyItem = (): GroceryItem => ({ name: '', category: '', amount: '', quantity: '' })

export default function GroceryItems({ onChange, money }: { onChange: (items: GroceryItem[]) => void; money: (amount: number) => string }) {
  const [rows, setRows] = useState<Array<GroceryItem & { id: string }>>([{ ...emptyItem(), id: crypto.randomUUID() }])
  function update(nextRows: typeof rows) {
    if (nextRows.length === 0 || completeItem(nextRows[nextRows.length - 1])) nextRows = [...nextRows, { ...emptyItem(), id: crypto.randomUUID() }]
    setRows(nextRows)
    onChange(nextRows.map(({ name, category, amount, quantity }) => ({ name, category, amount, quantity })))
  }
  const inputStyle = 'mt-1 w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-base'
  return <section aria-label="Productos del supermercado" className="space-y-4">
    {rows.map((row, index) => <div key={row.id} className="border-b border-line pb-4">
      <div className="flex items-center justify-between"><h3 className="text-sm font-medium">Producto {index + 1}</h3><button type="button" title="Eliminar producto" aria-label={`Eliminar producto ${index + 1}`} onClick={() => update(rows.filter(item => item.id !== row.id))} className="p-2 text-muted"><Trash2 size={16} /></button></div>
      <label className="block text-xs">Producto<input value={row.name} maxLength={100} onChange={event => update(rows.map(item => item.id === row.id ? { ...item, name: event.target.value } : item))} className={inputStyle} /></label>
      <label className="mt-2 block text-xs">Categoría del producto<select value={row.category} onChange={event => update(rows.map(item => item.id === row.id ? { ...item, category: event.target.value } : item))} className={inputStyle}><option value="">Seleccionar categoría</option>{expenseCategories.Supermercado.map(category => <option key={category}>{category}</option>)}</select></label>
      <label className="mt-2 block text-xs">Cantidad<input type="number" min="0.001" max="1000000" step="0.001" value={row.quantity} onChange={event => update(rows.map(item => item.id === row.id ? { ...item, quantity: event.target.value } : item))} className={inputStyle} /></label>
      <label className="mt-2 block text-xs">Precio unitario<input type="number" min="0.01" max="100000000" step="0.01" value={row.amount} onChange={event => update(rows.map(item => item.id === row.id ? { ...item, amount: event.target.value } : item))} className={inputStyle} /></label>
    </div>)}
    <p role="status" className="text-sm font-semibold">Total: {money(groceryTotal(rows))}</p>
  </section>
}