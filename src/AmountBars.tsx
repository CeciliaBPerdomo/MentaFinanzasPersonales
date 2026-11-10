type Props = {
  title: string
  entries: Array<{ name: string; amount: number; debt?: boolean }>
  money: (amount: number) => string
}

export default function AmountBars({ title, entries, money }: Props) {
  const maximum = Math.max(0, ...entries.map(entry => Math.abs(entry.amount)))
  return <section aria-label={title} className="mt-5 border-t border-line pt-4">
    <h3 className="text-sm font-semibold">{title}</h3>
    {entries.length === 0 ? <p className="mt-3 text-xs text-muted">Sin datos para mostrar.</p> : <ul className="mt-4 space-y-4">{entries.map((entry, index) => <li key={entry.name}>
      <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs"><span className="min-w-0 wrap-break-word">{entry.name}{entry.debt ? ' · Deuda' : ''}</span><strong className="font-medium tabular-nums">{money(entry.amount)}</strong></div>
      <div aria-hidden="true" className="h-3 overflow-hidden rounded-sm bg-[#e6e9e3]"><div className="h-full rounded-sm" style={{ width: `${maximum ? Math.abs(entry.amount) / maximum * 100 : 0}%`, background: entry.debt || entry.amount < 0 ? '#d78270' : ['#79bca2', '#a6be69', '#91aecb'][index % 3] }} /></div>
    </li>)}</ul>}
  </section>
}