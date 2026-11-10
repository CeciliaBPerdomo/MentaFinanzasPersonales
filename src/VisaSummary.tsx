import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import AddStatement from './AddStatement'
import AmountBars from './AmountBars'
import { installmentSchedule } from './lib/installments'
import type { InstallmentPurchase } from './lib/installments'

export type CreditStatement = { id: string; period: string; closing_on: string; due_on: string }
type Purchase = InstallmentPurchase & { id: string; name: string; currency: string }
type Props = { statements: CreditStatement[]; purchases: Purchase[]; currency: string; today: string; money: (amount: number, currency?: string) => string; onStatementSaved: () => void }
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-UY')
const periodLabel = (period: string) => new Date(`${period}T12:00:00`).toLocaleDateString('es-UY', { month: 'long', year: 'numeric' })

export default function VisaSummary({ statements, purchases, today, money, onStatementSaved }: Props) {
  const [chosenPeriod, setChosenPeriod] = useState('')
  const selectedPeriod = chosenPeriod || statements.find(statement => statement.closing_on >= today)?.period || statements.at(-1)?.period || ''
  const statement = statements.find(item => item.period === selectedPeriod)

  return (
    <section aria-labelledby="visa-summary-title" className="mb-8 border-t border-line py-5">
      <div className="mb-4 flex justify-end"><AddStatement onSaved={period => { setChosenPeriod(period); onStatementSaved() }} /></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="visa-summary-title" className="flex items-center gap-2 font-display text-xl"><CreditCard size={19} /> Visa BBVA · Cuotas por cierre</h2><select aria-label="Estado de cuenta de Visa" value={selectedPeriod} onChange={event => setChosenPeriod(event.target.value)} className="max-w-full rounded-lg border border-line bg-white px-3 py-2 text-sm">{statements.map(item => <option key={item.id} value={item.period}>{periodLabel(item.period)}</option>)}</select></div>
      {statement ? <>
        <p className="mt-3 text-xs text-muted">Cierre {dateLabel(statement.closing_on)} · Vencimiento {dateLabel(statement.due_on)}</p>
        <div className="mt-4 grid min-w-0 gap-5 lg:grid-cols-2">
        {(['UYU', 'USD'] as const).map(currency => {
          const currencyPurchases = purchases.filter(purchase => purchase.currency === currency)
          const installments = currencyPurchases.flatMap(purchase => installmentSchedule(purchase).map(installment => ({ ...installment, purchase })))
          const current = installments.filter(installment => installment.period === selectedPeriod)
          const total = current.reduce((sum, installment) => sum + installment.cents, 0) / 100
          const merchants = new Map<string, { name: string; cents: number }>()
          for (const installment of current) {
            const name = installment.purchase.name.trim()
            const key = name.toLocaleLowerCase('es-UY')
            const merchant = merchants.get(key)
            merchants.set(key, { name: merchant?.name ?? name, cents: (merchant?.cents ?? 0) + installment.cents })
          }
          const future = new Map<string, number>()
          for (const installment of installments) {
            if (installment.period > selectedPeriod) future.set(installment.period, (future.get(installment.period) ?? 0) + installment.cents)
          }
          const unassigned = currencyPurchases.filter(purchase => !purchase.first_statement_period).length
          return <section key={currency} aria-label={`Cuotas en ${currency === 'UYU' ? 'pesos' : 'dólares'}`} className="min-w-0 border-t border-line pt-3 lg:row-span-3 lg:grid lg:grid-rows-subgrid">
        <div>
        <p className="mt-4 text-xs text-muted">Estimado de compras registradas · {currency === 'UYU' ? 'Pesos' : 'Dólares'}</p><p className="mt-1 wrap-break-word text-2xl font-semibold">{money(total, currency)}</p>
        <ul className="mt-4 divide-y divide-line">{current.map(installment => <li key={`${installment.purchase.id}_${installment.number}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="min-w-0 wrap-break-word">{installment.purchase.name} <span className="text-xs text-muted">· {installment.number}/{installment.purchase.installment_count}</span></span><strong className="font-medium">{money(installment.cents / 100, currency)}</strong></li>)}</ul>
        {current.length === 0 && <p className="mt-3 text-sm text-muted">No hay cuotas asignadas a este cierre en esta moneda.</p>}
        </div>
        <AmountBars title={`Gastos por comercio · ${currency === 'UYU' ? 'Pesos' : 'Dólares'}`} entries={[...merchants.values()].sort((first, second) => second.cents - first.cents).map(merchant => ({ name: merchant.name, amount: merchant.cents / 100 }))} money={amount => money(amount, currency)} />
        <div>
        {future.size > 0 && <details className="mt-4"><summary className="cursor-pointer py-2 text-sm font-medium">Cuotas de cierres posteriores</summary><ul className="divide-y divide-line">{[...future.entries()].sort(([first], [second]) => first.localeCompare(second)).map(([period, amount]) => {
          const knownStatement = statements.find(item => item.period === period)
          return <li key={period} className="flex flex-wrap justify-between gap-2 py-3 text-xs"><span className="capitalize">{periodLabel(period)}<span className="mt-1 block normal-case text-muted">{knownStatement ? `Cierra ${dateLabel(knownStatement.closing_on)} · Vence ${dateLabel(knownStatement.due_on)}` : 'Fechas de cierre y vencimiento por confirmar'}</span></span><span>{money(amount / 100, currency)}</span></li>
        })}</ul></details>}
        {unassigned > 0 && <p className="mt-2 text-xs text-[#b4452d]">Compras anteriores sin cierre asignado: {unassigned}.</p>}
        </div>
          </section>
        })}
        </div>
      </> : <p className="mt-4 text-sm text-muted">No hay cierres registrados.</p>}
    </section>
  )
}