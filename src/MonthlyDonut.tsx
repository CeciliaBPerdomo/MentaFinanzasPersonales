type Props = {
  income: number
  expenses: number
  period: string
  currency: string
  money: (amount: number) => string
}

export default function MonthlyDonut({ income, expenses, period, currency, money }: Props) {
  const total = income + expenses
  const share = total > 0 ? income / total * 100 : 0
  return <section aria-labelledby="monthly-donut-title" className="border-b border-line p-5">
    <h3 id="monthly-donut-title" className="font-display text-lg font-semibold">Ingresos y egresos</h3>
    <p className="mt-2 text-xs text-muted">{period} · {currency === 'UYU' ? 'Pesos' : 'Dólares'}</p>
    <div role="img" aria-label={`Ingresos ${money(income)}; egresos ${money(expenses)}`} className="relative mx-auto my-6 grid size-40 place-items-center rounded-full" style={{ background: total > 0 ? `conic-gradient(#79bca2 0% ${share}%, #e68d77 ${share}% 100%)` : '#dfe3dc' }}>
      <div className="grid size-28 place-content-center rounded-full bg-[#eceee5] text-center"><span className="text-[10px] text-muted">Balance del mes</span><strong className="mt-1 max-w-24 wrap-anywhere text-sm tabular-nums">{money(income - expenses)}</strong></div>
    </div>
    <dl className="space-y-3 text-xs"><div className="flex flex-wrap items-center justify-between gap-2"><dt className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#79bca2]" />Ingresos</dt><dd className="font-semibold tabular-nums">{money(income)}</dd></div><div className="flex flex-wrap items-center justify-between gap-2"><dt className="flex items-center gap-2"><span className="size-2 rounded-full bg-[#e68d77]" />Egresos</dt><dd className="font-semibold tabular-nums">{money(expenses)}</dd></div></dl>
    {total === 0 && <p className="mt-4 text-xs text-muted">Sin ingresos ni egresos en este mes.</p>}
  </section>
}