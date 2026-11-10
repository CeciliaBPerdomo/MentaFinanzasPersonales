import { installmentSchedule } from './installments'

type Purchase = {
  account_id: string | null
  currency: string
  category: string
  amount: number
  occurred_on: string
  installment_count: number
  first_statement_period: string | null
}
type Account = { id: string; kind: string; institution?: string }

export function monthlyExpenses(purchases: Purchase[], accounts: Account[], period: string, currency: string, today: string) {
  const entries: Array<{ category: string; cents: number; credit: boolean }> = []
  for (const purchase of purchases) {
    if (purchase.currency !== currency || Number(purchase.amount) >= 0 || purchase.occurred_on > today) continue
    const account = accounts.find(item => item.id === purchase.account_id)
    if (account?.kind === 'credit') {
      const installment = installmentSchedule(purchase).find(item => item.period.slice(0, 7) === period)
      if (installment) entries.push({ category: purchase.category, cents: installment.cents, credit: true })
      else if (account.institution && account.institution !== 'BBVA' && !purchase.first_statement_period && purchase.installment_count === 1 && purchase.occurred_on.startsWith(period)) {
        entries.push({ category: purchase.category, cents: Math.round(Math.abs(Number(purchase.amount)) * 100), credit: true })
      }
    } else if (purchase.occurred_on.startsWith(period)) {
      entries.push({ category: purchase.category, cents: Math.round(Math.abs(Number(purchase.amount)) * 100), credit: false })
    }
  }
  return entries
}