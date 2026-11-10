import { House } from 'lucide-react'

type Props = {
  dollars: number
  money: (amount: number, currency?: string) => string
}

export default function HouseGoal({ dollars, money }: Props) {
  const target = 10000

  return (
    <article className="min-w-0 rounded-lg border border-line bg-white p-4">
      <div className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-lime"><House size={17} /></span><div><h3 className="text-sm font-semibold">Reforma de la casa</h3><p className="mt-1 text-xs text-muted">BROU · Dólares · Objetivo {money(target, 'USD')}</p></div></div>
      <p className="mt-4 text-sm">{money(dollars, 'USD')} <span className="text-muted">en BROU para la reforma</span></p>
      <progress aria-label="Ahorro para reforma de la casa" max={target} value={Math.max(0, dollars)} className="mt-3 h-2 w-full accent-[#79bca2]" />
      <p className="mt-2 text-right text-xs font-semibold text-[#bd3535]">Faltan {money(Math.max(0, target - dollars), 'USD')}</p>
    </article>
  )
}