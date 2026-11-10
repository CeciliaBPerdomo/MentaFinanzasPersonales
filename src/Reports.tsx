import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import AmountBars from './AmountBars'
import type { StoredGroceryItem } from './lib/grocery'

type Entry = { name: string; amount: number }
type GroceryPurchase = { id: string; name: string; occurred_on: string; grocery_items?: StoredGroceryItem[] | null }
type Props = { period: string; currency: string; incomes: Entry[]; expenses: Entry[]; groceries: GroceryPurchase[]; money: (amount: number) => string }

export default function Reports({ period, currency, incomes, expenses, groceries, money }: Props) {
  const products = [...groceries].sort((first, second) => second.occurred_on.localeCompare(first.occurred_on)).flatMap(purchase => (purchase.grocery_items ?? []).map((item, index) => ({ ...item, id: `${purchase.id}_${index}`, store: purchase.name, date: purchase.occurred_on })))
  const missingDetails = groceries.filter(purchase => !purchase.grocery_items?.length).length
  const total = (entries: Entry[]) => entries.reduce((sum, entry) => sum + Math.round(entry.amount * 100), 0) / 100
  const groups = [
    { title: 'Ingresos', entries: incomes, icon: ArrowDownLeft, background: 'bg-mint', color: 'text-[#355c48]' },
    { title: 'Egresos', entries: expenses, icon: ArrowUpRight, background: 'bg-[#f8e6e1]', color: 'text-[#aa4936]' },
  ]
  return <section aria-labelledby="reports-title" className="mt-5">
    <h2 id="reports-title" className="font-display text-2xl font-semibold">Reporte mensual</h2>
    <p className="mt-2 text-sm text-muted">{new Date(`${period}-01T12:00:00`).toLocaleDateString('es-UY', { month: 'long', year: 'numeric' })} · {currency === 'UYU' ? 'Pesos uruguayos ($)' : 'Dólares (u$s)'}</p>
    <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">{groups.map(({ title, entries, icon: Icon, background, color }) => <section key={title} aria-label={`Reporte de ${title.toLowerCase()}`} className="min-w-0 lg:row-span-3 lg:grid lg:grid-rows-subgrid">
      <article className={`min-w-0 rounded-lg p-5 ${background}`}><h3 className={`flex items-center gap-2 text-sm font-medium ${color}`}><Icon size={18} /> Total de {title.toLowerCase()}</h3><p className="mt-4 wrap-anywhere text-2xl font-semibold tabular-nums">{money(total(entries))}</p></article>
      <div className="mt-5 lg:mt-0"><h3 className="text-sm font-semibold">{title} por categoría</h3><dl className="mt-3 divide-y divide-line">{entries.map(entry => <div key={entry.name} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><dt className="min-w-0 wrap-break-word">{entry.name}</dt><dd className="font-semibold tabular-nums">{money(entry.amount)}</dd></div>)}</dl>{entries.length === 0 && <p className="mt-4 text-sm text-muted">Sin {title.toLowerCase()} en este mes y moneda.</p>}</div>
      <AmountBars title={`Gráfico de ${title.toLowerCase()} por categoría`} entries={entries} money={money} />
    </section>)}</div>
    <section aria-labelledby="grocery-report-title" className="mt-9 border-t border-line pt-6">
      <h2 id="grocery-report-title" className="font-display text-xl font-semibold">Productos del supermercado</h2>
      <p className="mt-2 text-xs text-muted">Compras realizadas en el mes seleccionado, por fecha de compra. Los productos de tickets en cuotas se muestran completos, no repartidos por cierre.</p>
      {products.length > 0 ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] border-collapse text-left text-xs">
        <caption className="sr-only">Detalle de productos comprados en supermercado durante {period}</caption>
        <thead className="bg-[#eceeeb]"><tr>{['Fecha / Supermercado', 'Producto', 'Categoría', 'Cantidad', 'Precio unitario', 'Total'].map((heading, index) => <th key={heading} scope="col" className={`px-3 py-3 font-semibold ${index >= 3 ? 'text-right' : ''}`}>{heading}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{products.map(product => <tr key={product.id}><td className="px-3 py-3 align-top"><p>{new Date(`${product.date}T12:00:00`).toLocaleDateString('es-UY')}</p><p className="mt-1 wrap-break-word text-muted">{product.store}</p></td><th scope="row" className="max-w-48 wrap-break-word px-3 py-3 align-top font-medium">{product.name}</th><td className="px-3 py-3 align-top">{product.category}</td><td className="px-3 py-3 text-right align-top tabular-nums">{product.quantity != null ? new Intl.NumberFormat('es-UY', { maximumFractionDigits: 3 }).format(product.quantity) : 'Sin registrar'}</td><td className="px-3 py-3 text-right align-top tabular-nums">{product.unit_price != null ? money(product.unit_price) : 'Sin registrar'}</td><td className="px-3 py-3 text-right align-top font-semibold tabular-nums">{money(product.amount)}</td></tr>)}</tbody>
        <tfoot><tr className="border-t border-line"><th colSpan={5} scope="row" className="px-3 py-4 font-semibold">Total de productos detallados</th><td className="px-3 py-4 text-right font-semibold tabular-nums">{money(products.reduce((sum, product) => sum + Math.round(Number(product.amount) * 100), 0) / 100)}</td></tr></tfoot>
      </table></div> : <p className="mt-4 text-sm text-muted">No hay productos detallados en este mes y moneda.</p>}
      {missingDetails > 0 && <p className="mt-3 text-xs text-muted">Tickets sin productos detallados: {missingDetails}.</p>}
    </section>
  </section>
}