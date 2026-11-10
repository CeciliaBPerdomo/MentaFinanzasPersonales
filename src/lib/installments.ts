export type InstallmentPurchase = {
  amount: number
  installment_count: number
  first_statement_period: string | null
}

export type Installment = { period: string; number: number; cents: number }

export function installmentSchedule(purchase: InstallmentPurchase): Installment[] {
  const count = Number(purchase.installment_count)
  const total = Math.round(Math.abs(Number(purchase.amount)) * 100)
  if (!purchase.first_statement_period || !/^\d{4}-\d{2}-01$/.test(purchase.first_statement_period)
    || !Number.isInteger(count) || count < 1 || count > 120 || !Number.isSafeInteger(total) || total < count) return []
  const [year, month] = purchase.first_statement_period.split('-').map(Number)
  if (month < 1 || month > 12) return []
  const base = Math.floor(total / count)
  const remainder = total % count
  return Array.from({ length: count }, (_, index) => {
    const monthIndex = year * 12 + month - 1 + index
    const periodYear = Math.floor(monthIndex / 12)
    const periodMonth = monthIndex % 12 + 1
    return {
      period: `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`,
      number: index + 1,
      cents: base + (index < remainder ? 1 : 0),
    }
  })
}