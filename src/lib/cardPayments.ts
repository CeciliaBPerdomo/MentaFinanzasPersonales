export type CardPayment = {
  id: string
  source_account_id: string
  card_account_id: string
  currency: string
  amount: number
  occurred_on: string
}

export function paymentEffect(payments: CardPayment[], account: { id: string; currency: string; opening_date: string }, today: string) {
  return payments.filter(payment => payment.currency === account.currency && payment.occurred_on >= account.opening_date && payment.occurred_on <= today)
    .reduce((sum, payment) => {
      const amount = Math.round(Number(payment.amount) * 100)
      return sum + (payment.card_account_id === account.id ? amount : payment.source_account_id === account.id ? -amount : 0)
    }, 0)
}