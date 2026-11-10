import { installmentSchedule } from './installments'
import type { InstallmentPurchase } from './installments'
import type { CardPayment } from './cardPayments'

type Account = { id: string; institution: string; kind: string; currency: string; opening_balance: number; opening_date: string }
type Purchase = InstallmentPurchase & { account_id: string | null; currency: string; occurred_on: string }

export function statementDebt(accounts: Account[], purchases: Purchase[], payments: CardPayment[], period: string, currency: string, today: string) {
  if (period < '2026-11') return 0
  let debtCents = 0
  for (const account of accounts.filter(item => item.kind === 'credit' && item.institution === 'BBVA' && item.currency === currency)) {
    debtCents -= Math.round(Number(account.opening_balance) * 100)
    for (const purchase of purchases) {
      if (purchase.account_id !== account.id || purchase.currency !== currency || Number(purchase.amount) >= 0 || purchase.occurred_on < account.opening_date || purchase.occurred_on > today) continue
      debtCents += installmentSchedule(purchase).filter(installment => installment.period.slice(0, 7) <= period)
        .reduce((sum, installment) => sum + installment.cents, 0)
    }
    debtCents -= payments.filter(payment => payment.card_account_id === account.id && payment.currency === currency && payment.occurred_on >= account.opening_date && payment.occurred_on <= today && payment.occurred_on.slice(0, 7) <= period)
      .reduce((sum, payment) => sum + Math.round(Number(payment.amount) * 100), 0)
  }
  return Math.max(0, debtCents) / 100
}