import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChartColumn, ChevronLeft, ChevronRight, CreditCard, Eye, EyeOff, Flower2, LayoutGrid, LoaderCircle, LogOut, RefreshCw, Save, Target, Wallet, X } from 'lucide-react'
import { supabase } from './lib/supabase'
import { installmentSchedule } from './lib/installments'
import { monthlyExpenses } from './lib/monthlyExpenses'
import { statementDebt } from './lib/statementDebt'
import VisaSummary from './VisaSummary'
import HouseGoal from './HouseGoal'
import InvestmentGoal from './InvestmentGoal'
import Reports from './Reports'
import AmountBars from './AmountBars'
import MonthlyDonut from './MonthlyDonut'
import AccountManager from './AccountManager'
import CardPaymentMovement from './CardPaymentManager'
import CardPaymentForm from './CardPaymentForm'
import { paymentEffect } from './lib/cardPayments'
import type { CardPayment } from './lib/cardPayments'
import DeleteTransaction from './DeleteTransaction'
import GroceryItems from './GroceryItems'
import { completeItem, groceryLineCents, groceryTotal } from './lib/grocery'
import type { GroceryItem, StoredGroceryItem } from './lib/grocery'
import { expenseCategories, expenseGroup } from './lib/expenseCategories'
import type { CreditStatement } from './VisaSummary'

type Currency = 'UYU' | 'USD'
type Account = { id: string; institution: string; kind: 'cash' | 'credit'; currency: Currency; opening_balance: number; opening_date: string }
type Transaction = { id: string; name: string; category: string; subcategory?: string | null; detail?: string | null; grocery_items?: StoredGroceryItem[] | null; amount: number; currency: string; occurred_on: string; account_id: string | null; installment_count: number; first_statement_period: string | null }
type Goal = { id: string; name: string; saved: number; target: number; currency: string }
const navigation = [{ name: 'Resumen', icon: LayoutGrid }, { name: 'Movimientos', icon: ArrowDownLeft }, { name: 'Metas', icon: Target }, { name: 'Reportes', icon: ChartColumn }]
const inputClass = 'mt-2 w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2.5 text-base'
const cents = (amount: number) => Math.round(Number(amount) * 100)
const accountName = (account: Account) => `${account.institution === 'BBVA' && account.kind === 'credit' ? 'Visa BBVA' : account.institution} · ${account.currency === 'UYU' ? '$' : 'u$s'}`
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

async function loadRows(table: string, columns: string) {
  if (!supabase) throw new Error('missing_config')
  const rows: unknown[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order('id').range(offset, offset + 999)
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

async function loadPayments() {
  try {
    return { rows: await loadRows('card_payments', '*') as CardPayment[], ready: true }
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'PGRST205' || code === '42P01') return { rows: [] as CardPayment[], ready: false }
    throw error
  }
}

export default function RealDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [statements, setStatements] = useState<CreditStatement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [view, setView] = useState('Resumen')
  const [currency, setCurrency] = useState<Currency>('UYU')
  const [period, setPeriod] = useState(() => localDate(new Date()).slice(0, 7))
  const [hidden, setHidden] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [accountId, setAccountId] = useState('')
  const [query, setQuery] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(() => localDate(new Date()))
  const [firstPeriod, setFirstPeriod] = useState('')
  const [installmentCount, setInstallmentCount] = useState('1')
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('Gastos mensuales')
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([])
  const [payments, setPayments] = useState<CardPayment[]>([])
  const [paymentsReady, setPaymentsReady] = useState(false)
  const today = localDate(new Date())

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        if (!supabase) throw new Error('missing_config')
        const { error: statementError } = await supabase.rpc('initialize_visa_statements')
        if (statementError) throw statementError
        const [accountRows, transactionRows, goalRows, statementRows, paymentData] = await Promise.all([
          loadRows('accounts', 'id,institution,kind,currency,opening_balance,opening_date'),
          loadRows('transactions', '*'),
          loadRows('goals', 'id,name,saved,target,currency'),
          loadRows('credit_statements', 'id,period,closing_on,due_on'),
          loadPayments(),
        ])
        if (!active) return
        setAccounts(accountRows as Account[])
        setTransactions(transactionRows as Transaction[])
        setGoals(goalRows as Goal[])
        setPayments(paymentData.rows)
        setPaymentsReady(paymentData.ready)
        setStatements((statementRows as CreditStatement[]).sort((first, second) => first.period.localeCompare(second.period)))
      } catch {
        if (active) setError('No se pudo cargar tu información. Comprueba tu conexión y que el script de cuotas de Visa esté ejecutado.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [attempt])

  const money = (amount: number, unit: string = currency) => hidden ? '••••' : `${unit === 'UYU' ? '$' : unit === 'USD' ? 'u$s' : unit} ${new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`
  const currentAccounts = accounts.filter(account => account.currency === currency)
  const accountBalance = (account: Account) => (cents(account.opening_balance) + transactions.filter(transaction => transaction.account_id === account.id && transaction.currency === account.currency && transaction.occurred_on >= account.opening_date && transaction.occurred_on <= today).reduce((sum, transaction) => sum + cents(transaction.amount), 0) + paymentEffect(payments, account, today)) / 100
  const availableByBank = ['Prex', 'BROU'].map(institution => ({
    institution,
    balance: currentAccounts.filter(account => account.kind === 'cash' && account.institution === institution && account.opening_date <= today).reduce((sum, account) => sum + cents(accountBalance(account)), 0) / 100,
  }))
  const available = availableByBank.reduce((sum, bank) => sum + cents(bank.balance), 0) / 100
  const brouBalance = (unit: Currency) => accounts.filter(account => account.institution === 'BROU' && account.kind === 'cash' && account.currency === unit && account.opening_date <= today).reduce((sum, account) => sum + cents(accountBalance(account)), 0) / 100
  const expenseEntries = monthlyExpenses(transactions, accounts, period, currency, today)
  const debt = (unit: Currency) => statementDebt(accounts, transactions, payments, period, unit, today)
  const selectedStatement = statements.find(statement => statement.period.slice(0, 7) === period)
  const monthly = transactions.filter(transaction => transaction.currency === currency && transaction.occurred_on.startsWith(period) && transaction.occurred_on <= today)
  const income = monthly.filter(transaction => transaction.amount > 0).reduce((sum, transaction) => sum + cents(transaction.amount), 0) / 100
  const expenses = expenseEntries.reduce((sum, entry) => sum + entry.cents, 0) / 100
  const incomeGroups = new Map<string, number>()
  for (const transaction of monthly.filter(item => Number(item.amount) > 0)) {
    const name = transaction.subcategory?.trim() || 'Otros'
    incomeGroups.set(name, (incomeGroups.get(name) ?? 0) + cents(transaction.amount))
  }
  const reportIncomes = [...incomeGroups.entries()].map(([name, amount]) => ({ name, amount: amount / 100 })).sort((first, second) => second.amount - first.amount)
  const expenseGroups = new Map<string, number>()
  for (const entry of expenseEntries) {
    const name = expenseGroup(entry.category)
    expenseGroups.set(name, (expenseGroups.get(name) ?? 0) + entry.cents)
  }
  const reportExpenses = [...expenseGroups.entries()].map(([name, amount]) => ({ name, amount: amount / 100 })).sort((first, second) => second.amount - first.amount)
  const paymentMovements = payments.filter(payment => payment.currency === currency && payment.occurred_on.startsWith(period) && payment.occurred_on <= today).map(payment => ({ ...payment, name: `Pago de tarjeta · ${accounts.find(account => account.id === payment.source_account_id)?.institution ?? 'Banco'} → ${accounts.find(account => account.id === payment.card_account_id)?.institution ?? 'Tarjeta'}` }))
  const visible = [...monthly, ...paymentMovements].filter(transaction => transaction.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((first, second) => second.occurred_on.localeCompare(first.occurred_on) || second.id.localeCompare(first.id))
  const selectedAccount = accounts.find(account => account.id === accountId)
  const isVisa = selectedAccount?.kind === 'credit' && selectedAccount.institution === 'BBVA'
  const formAccounts = accounts.filter(account => transactionType === 'expense' || account.kind === 'cash')
  const eligibleStatements = statements.filter(statement => statement.closing_on >= purchaseDate)
  const effectiveFirstPeriod = firstPeriod || eligibleStatements.find(statement => statement.closing_on >= today)?.period || eligibleStatements[0]?.period || ''
  const isGrocery = transactionType === 'expense' && expenseCategory === 'Supermercado'
  const movementAmount = isGrocery ? groceryTotal(groceryItems) : Number(purchaseAmount)
  const preview = installmentSchedule({ amount: movementAmount, installment_count: Number(installmentCount), first_statement_period: effectiveFirstPeriod })
  const visaPurchases = transactions.filter(transaction => accounts.some(account => account.id === transaction.account_id && account.kind === 'credit' && account.institution === 'BBVA') && transaction.amount < 0 && transaction.occurred_on <= today)
  const categories = Object.keys(expenseCategories).map((name, index) => ({ name, color: ['#b8d78e', '#f4c561', '#a5b8ee', '#ee916c', '#79bca2', '#e3b2c4', '#a4ada1', '#86b9c9'][index], amount: expenseEntries.filter(entry => expenseGroup(entry.category) === name).reduce((sum, entry) => sum + entry.cents, 0) / 100 }))

  function moveMonth(direction: number) {
    const [year, month] = period.split('-').map(Number)
    setPeriod(localDate(new Date(year, month - 1 + direction, 1)).slice(0, 7))
  }

  function openTransaction(type: 'expense' | 'income') {
    const eligibleAccounts = accounts.filter(account => type === 'expense' || account.kind === 'cash')
    setTransactionType(type)
    setAccountId(eligibleAccounts.find(account => account.currency === currency)?.id ?? eligibleAccounts[0]?.id ?? '')
    setPurchaseDate(today)
    setFirstPeriod('')
    setInstallmentCount('1')
    setPurchaseAmount('')
    setExpenseCategory('Gastos mensuales')
    setGroceryItems([])
    setFormError('')
    setShowForm(true)
  }

  async function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (transactionType === 'expense' && expenseCategory === 'Pagar tarjeta') return
    if (!supabase || busy || !selectedAccount) return
    const form = new FormData(event.currentTarget)
    const amount = movementAmount
    const category = transactionType === 'income' ? 'Ingresos' : expenseCategory
    const subcategory = String(form.get('subcategory') ?? '').trim()
    if (transactionType === 'income' && !['Sueldo', 'Inversión Violeta', 'Alquiler', 'Otros'].includes(subcategory)) {
      setFormError('Selecciona el tipo de ingreso.')
      return
    }
    const name = transactionType === 'income' || isGrocery || selectedAccount.kind === 'credit'
      ? String(form.get('name') ?? '').trim()
      : `${category}${subcategory ? ` · ${subcategory}` : ''}`.slice(0, 70)
    const detail = transactionType === 'expense' ? String(form.get('detail') ?? '').trim() : ''
    const occurredOn = String(form.get('occurred_on'))
    const products = groceryItems.filter(item => item.name.trim() || item.category || item.amount || item.quantity)
    if (isGrocery && (products.length === 0 || products.length > 200 || products.some(item => !completeItem(item)))) {
      setFormError('Completa nombre, categoría, cantidad y precio unitario de cada producto o elimina las filas incompletas. Máximo 200 productos.')
      return
    }
    if (!name || !Number.isFinite(amount) || amount <= 0 || amount > 100000000 || occurredOn < selectedAccount.opening_date || occurredOn > today) {
      setFormError('Revisa el importe, el concepto y la fecha. La fecha no puede ser anterior al saldo inicial ni posterior a hoy.')
      return
    }
    if (selectedAccount.kind === 'credit' && category === 'Ingresos') {
      setFormError('La Visa registra compras, no ingresos. Los pagos de tarjeta requieren una transferencia, que todavía no está habilitada.')
      return
    }
    const count = isVisa ? Number(installmentCount) : 1
    const firstStatement = isVisa ? effectiveFirstPeriod : null
    if (isVisa && (!eligibleStatements.some(statement => statement.period === firstStatement) || installmentSchedule({ amount, installment_count: count, first_statement_period: firstStatement }).length === 0)) {
      setFormError('Elige un cierre válido y entre 1 y 120 cuotas. Cada cuota debe ser de al menos un centésimo.')
      return
    }
    setBusy(true)
    setFormError('')
    try {
      const { error: saveError } = await supabase.from('transactions').insert({ account_id: selectedAccount.id, currency: selectedAccount.currency, name, category, ...(subcategory ? { subcategory } : {}), ...(detail ? { detail } : {}), ...(isGrocery ? { grocery_items: products.map(item => ({ name: item.name.trim(), category: item.category, amount: groceryLineCents(item) / 100, quantity: Number(item.quantity), unit_price: Math.round(Number(item.amount) * 100) / 100 })) } : {}), amount: transactionType === 'income' ? amount : -amount, occurred_on: occurredOn, installment_count: count, first_statement_period: firstStatement })
      if (saveError) throw saveError
      setCurrency(selectedAccount.currency)
      setPeriod(occurredOn.slice(0, 7))
      setShowForm(false)
      setAttempt(value => value + 1)
    } catch (error: unknown) {
      console.error('Error al guardar movimiento:', error)

      const message =
        typeof error === 'string'
          ? error
          : error && typeof error === 'object' && 'message' in error
            ? String(error.message)
            : 'Error desconocido al guardar'

      setFormError(`Error al guardar: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[1600px] bg-paper md:my-6 md:w-[calc(100%-3rem)] md:p-4">
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col md:flex-row">
        <aside className="flex items-center justify-between border-b border-line p-4 md:w-18 md:shrink-0 md:flex-col md:rounded-lg md:border-0 md:bg-[#eceee5]">
          <button aria-label="Inicio" onClick={() => setView('Resumen')} className="text-coral"><Flower2 size={29} /></button>
          <nav aria-label="Navegación principal" className="flex gap-3 md:mt-12 md:flex-1 md:flex-col">{navigation.map(({ name, icon: Icon }) => <button key={name} title={name} aria-label={name} aria-current={view === name ? 'page' : undefined} onClick={() => setView(name)} className={`grid size-10 place-items-center rounded-full ${view === name ? 'bg-[#293e31] text-white' : 'bg-white hover:bg-lime'}`}><Icon size={18} /></button>)}</nav>
          <button aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onSignOut} className="grid size-10 place-items-center rounded-full bg-white"><LogOut size={18} /></button>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-7 lg:px-9">
          <header><p className="text-xs font-medium text-muted">MENTA · FINANZAS PERSONALES</p><h1 className="mt-2 font-display text-3xl">Tu dinero, en equilibrio<span className="text-coral">.</span></h1></header>
          <div className="my-7 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center rounded-lg border border-line bg-white p-1"><button aria-label="Mes anterior" onClick={() => moveMonth(-1)} className="p-2"><ChevronLeft size={16} /></button><input aria-label="Mes de los movimientos" type="month" required value={period} onChange={event => { if (event.target.value) setPeriod(event.target.value) }} className="min-w-0 w-36 bg-transparent text-xs" /><button aria-label="Mes siguiente" onClick={() => moveMonth(1)} className="p-2"><ChevronRight size={16} /></button></div>
            <div role="group" aria-label="Moneda" className="flex rounded-lg border border-line bg-white p-1">{(['UYU', 'USD'] as const).map(unit => <button key={unit} aria-pressed={currency === unit} onClick={() => setCurrency(unit)} className={`rounded px-3 py-2 text-xs ${currency === unit ? 'bg-[#293e31] text-white' : 'hover:bg-paper'}`}>{unit === 'UYU' ? '$ Pesos' : 'u$s Dólares'}</button>)}</div>
            <div className="flex flex-wrap gap-2">
              <button disabled={loading || !!error || accounts.length === 0} onClick={() => openTransaction('expense')} className="flex items-center gap-2 rounded-lg bg-[#293e31] px-3 py-3 text-xs text-white disabled:opacity-40"><ArrowUpRight size={16} /> Agregar egreso</button>
              <button disabled={loading || !!error || !accounts.some(account => account.kind === 'cash')} onClick={() => openTransaction('income')} className="flex items-center gap-2 rounded-lg border border-[#aac9b5] bg-mint px-3 py-3 text-xs text-[#293e31] disabled:opacity-40"><ArrowDownLeft size={16} /> Agregar ingreso</button>
            </div>
          </div>
          <div className="mb-5 flex items-center justify-end gap-3">{(loading || error) && <span className="text-xs text-muted">{loading ? 'Cargando información…' : 'Información no disponible'}</span>}<button aria-label="Actualizar datos" title="Actualizar datos" disabled={loading} onClick={() => setAttempt(value => value + 1)} className="p-2"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button></div>
          {loading ? <p role="status" className="flex items-center gap-2 py-12 text-sm text-muted"><LoaderCircle size={18} className="animate-spin" /> Cargando tus cuentas y movimientos…</p> : error ? <p role="alert" className="py-8 text-sm text-[#b4452d]">{error}</p> : <>
            {accounts.length === 0 && <p className="mb-5 text-sm text-muted">No tienes cuentas registradas. Configura tus saldos iniciales antes de añadir movimientos.</p>}
            {view === 'Reportes' ? <Reports period={period} currency={currency} incomes={reportIncomes} expenses={reportExpenses} groceries={monthly.filter(transaction => transaction.category === 'Supermercado' && transaction.amount < 0)} money={money} /> : <>
              {view === 'Resumen' && <section aria-label="Resumen financiero">
                <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl">Tu panorama</h2><button aria-label={hidden ? 'Mostrar importes' : 'Ocultar importes'} title={hidden ? 'Mostrar importes' : 'Ocultar importes'} onClick={() => setHidden(!hidden)}>{hidden ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <article className="min-w-0 rounded-lg bg-lime p-5">
                    <h2 className="flex items-center gap-2 text-xs"><Wallet size={16} /> Disponible actual · {currency === 'UYU' ? 'Pesos' : 'Dólares'}</h2>
                    <dl className="mt-5 space-y-3">{availableByBank.map(bank => <div key={bank.institution} className="flex flex-wrap items-center justify-between gap-2 text-sm"><dt>{bank.institution}</dt><dd className="wrap-anywhere font-semibold tabular-nums">{money(bank.balance)}</dd></div>)}</dl>
                    <div className="mt-4 border-t border-[#bccd8a] pt-4 text-right"><p className="text-xs font-medium">Total Prex + BROU</p><p className="mt-1 wrap-anywhere text-2xl font-semibold text-[#23633e] tabular-nums">{money(available)}</p></div>
                    <p className="mt-3 text-xs text-muted">Al {new Date(`${today}T12:00:00`).toLocaleDateString('es-UY')}</p>
                  </article>
                  <article className="min-w-0 rounded-lg bg-mint p-5">
                    <p className="flex items-center gap-2 text-xs"><CreditCard size={16} /> Visa BBVA · {new Date(`${period}-01T12:00:00`).toLocaleDateString('es-UY', { month: 'long', year: 'numeric' })}</p>
                    <dl className="mt-5 space-y-3">{(['UYU', 'USD'] as const).map(unit => <div key={unit}><dt className="text-xs text-muted">{unit === 'UYU' ? 'Pesos' : 'Dólares'}</dt><dd className="mt-1 wrap-anywhere text-2xl font-semibold tabular-nums">{money(debt(unit), unit)}</dd></div>)}</dl>
                    <p className="mt-2 text-xs text-muted">Pendiente acumulado · Incluye saldo anterior</p><p className="mt-3 text-xs text-muted">{selectedStatement ? `Cierre ${new Date(`${selectedStatement.closing_on}T12:00:00`).toLocaleDateString('es-UY')} · Vence ${new Date(`${selectedStatement.due_on}T12:00:00`).toLocaleDateString('es-UY')}` : 'Fechas de cierre y vencimiento por confirmar'}</p>
                  </article>
                </div>
                <div className="my-4 grid gap-3 sm:grid-cols-2"><article className="flex min-w-0 items-center gap-3 rounded-lg border border-[#dfe2df] bg-[#eceeeb] p-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#527d65]"><ArrowDownLeft size={18} /></span><div className="min-w-0"><h3 className="text-xs text-muted">Ingresos del mes</h3><p className="mt-1 wrap-break-word text-base font-semibold tabular-nums">{money(income)}</p></div></article><article className="flex min-w-0 items-center gap-3 rounded-lg border border-[#dfe2df] bg-[#eceeeb] p-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-coral"><ArrowUpRight size={18} /></span><div className="min-w-0"><h3 className="text-xs text-muted">Gastos del mes</h3><p className="mt-1 wrap-break-word text-base font-semibold tabular-nums">{money(expenses)}</p></div></article></div>
              </section>}
              {view !== 'Metas' && <section className="mt-7"><h2 className="font-display text-xl">{view === 'Resumen' ? 'Últimos movimientos' : 'Tus movimientos'}</h2>{view === 'Movimientos' && <input aria-label="Buscar movimientos" placeholder="Buscar movimiento" value={query} onChange={event => setQuery(event.target.value)} className={inputClass} />}<div className="mt-4 space-y-2">{visible.slice(0, view === 'Resumen' ? 5 : undefined).map(transaction => {
                if ('source_account_id' in transaction) return <CardPaymentMovement key={transaction.id} accounts={accounts} payment={transaction} money={money} onChanged={() => setAttempt(value => value + 1)} />
                const account = accounts.find(item => item.id === transaction.account_id)
                return <article key={transaction.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-mint">{transaction.amount > 0 ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
                  <div className="min-w-0 flex-1"><h3 className="wrap-break-word text-sm font-medium">{transaction.name}</h3><p className="mt-1 text-[11px] text-muted">{account ? accountName(account) : 'Sin cuenta asignada'} · {expenseGroup(transaction.category)}{transaction.subcategory ? ` · ${transaction.subcategory}` : ''} · {new Date(`${transaction.occurred_on}T12:00:00`).toLocaleDateString('es-UY')}</p>{transaction.detail && <p className="mt-1 whitespace-pre-wrap wrap-break-word text-xs text-muted">{transaction.detail}</p>}</div>
                  <span className="shrink-0 text-xs font-semibold">{transaction.amount > 0 ? '+' : '−'}{money(Math.abs(transaction.amount), transaction.currency)}</span>
                  <DeleteTransaction transaction={transaction} amount={money(Math.abs(transaction.amount), transaction.currency)} onDeleted={() => setAttempt(value => value + 1)} />
                  {transaction.grocery_items && <details className="basis-full text-xs"><summary className="cursor-pointer py-2">Ver productos</summary><ul className="space-y-2">{transaction.grocery_items.map((item, index) => <li key={index} className="flex flex-wrap justify-between gap-2"><span className="wrap-break-word">{item.name} · {item.category}</span><span>{money(item.amount, transaction.currency)}</span></li>)}</ul></details>}
                </article>
              })}{visible.length === 0 && <p className="py-7 text-sm text-muted">No hay movimientos en esta moneda y período.</p>}</div></section>}
              {view !== 'Movimientos' && <section className="mt-8"><h2 className="font-display text-xl">Tus metas</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">
                <HouseGoal dollars={brouBalance('USD')} money={money} />
                <InvestmentGoal goal={goals.find(goal => goal.name === 'Inversiones' && goal.currency === 'USD')} money={money} onSaved={() => setAttempt(value => value + 1)} />
                {goals.filter(goal => goal.currency === currency && !(goal.currency === 'USD' && ['Reforma de la casa · BROU', 'Inversiones'].includes(goal.name))).map(goal => <article key={goal.id} className="rounded-lg border border-line bg-white p-4"><h3 className="text-sm font-medium">{goal.name}</h3><p className="mt-3 text-xs text-muted">{money(goal.saved, goal.currency)} de {money(goal.target, goal.currency)}</p><progress aria-label={goal.name} max={Number(goal.target)} value={Number(goal.saved)} className="mt-3 h-2 w-full accent-[#79bca2]" /></article>)}
              </div></section>}
              <div className="mt-8"><VisaSummary statements={statements} purchases={visaPurchases} currency={currency} today={today} money={money} onStatementSaved={() => setAttempt(value => value + 1)} /></div>
              <section className="mt-9 border-t border-line pt-6">
                <h2 className="font-display text-xl">Saldos por cuenta</h2>
                <table className="mt-4 w-full table-fixed border-collapse text-xs sm:text-sm">
                  <colgroup><col className="w-[28%]" /><col className="w-[36%]" /><col className="w-[36%]" /></colgroup>
                  <thead><tr className="border-b border-line text-muted"><th scope="col" className="py-3 pr-2 text-left font-medium">Cuenta</th><th scope="col" className="px-1 py-3 text-right font-medium">Pesos $</th><th scope="col" className="pl-1 py-3 text-right font-medium">Dólares u$s</th></tr></thead>
                  <tbody>{accounts.filter((account, index) => accounts.findIndex(item => item.institution === account.institution && item.kind === account.kind) === index).sort((first, second) => first.institution.localeCompare(second.institution)).map(group => <tr key={`${group.institution}_${group.kind}`} className="border-b border-line"><th scope="row" className="wrap-break-word py-4 pr-2 text-left font-semibold">{group.institution === 'BBVA' && group.kind === 'credit' ? 'Visa BBVA' : group.institution}</th>{(['UYU', 'USD'] as const).map(unit => {
                    const account = accounts.find(item => item.institution === group.institution && item.kind === group.kind && item.currency === unit)
                    const balance = account ? accountBalance(account) : 0
                    return <td key={unit} className="px-1 py-4 text-right align-top"><p className="wrap-anywhere font-semibold tabular-nums">{!account ? 'Sin cuenta' : account.opening_date > today ? 'Aún no vigente' : money(account.kind === 'credit' ? Math.abs(balance) : balance, unit)}</p>{account && <p className="mt-1 text-[10px] text-muted">{account.kind === 'credit' ? balance > 0 ? 'A favor' : 'Deuda' : 'Disponible'}</p>}</td>
                  })}</tr>)}</tbody>
                </table>
                <div className="grid min-w-0 gap-5 lg:grid-cols-2">{(['UYU', 'USD'] as const).map(unit => <AmountBars key={unit} title={`Saldos por cuenta · ${unit === 'UYU' ? 'Pesos' : 'Dólares'}`} entries={accounts.filter(account => account.currency === unit && account.opening_date <= today).sort((first, second) => Number(first.kind === 'credit') - Number(second.kind === 'credit') || first.institution.localeCompare(second.institution)).map(account => ({ name: account.institution === 'BBVA' ? 'Visa BBVA' : account.institution, amount: account.kind === 'credit' ? Math.abs(accountBalance(account)) : accountBalance(account), debt: account.kind === 'credit' && accountBalance(account) <= 0 }))} money={amount => money(amount, unit)} />)}</div>
                {accounts.length === 0 && <p className="mt-3 text-sm text-muted">No hay cuentas registradas.</p>}
              </section>
            </>}
          </>}
          <footer className="mt-8 border-t border-line pt-4 text-xs text-muted">menta · Cecilia Perdomo</footer>
        </main>
        <aside className="mx-5 mb-5 overflow-hidden rounded-lg bg-[#eceee5] md:mx-0 md:mb-0 md:w-60 md:shrink-0 lg:w-70" aria-label="Resumen del mes">
          <header aria-label="Perfil de Cecilia Perdomo" className="border-t-4 border-coral bg-mint px-5 pb-7 pt-6">
            <p className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#456b58]">Tu espacio personal<Flower2 aria-hidden="true" size={18} className="shrink-0 text-coral" /></p>
            <img src="/myAvatar.png" alt="Cecilia Perdomo" className="mt-6 size-20 rounded-full border-4 border-white object-cover shadow-sm" />
            <h2 className="mt-4 font-display text-2xl font-semibold leading-tight text-[#293e31]">Cecilia<span className="block">Perdomo</span></h2>
            <div aria-hidden="true" className="mt-4 h-1 w-8 rounded-full bg-coral" />
          </header>
          {!loading && !error && <MonthlyDonut income={income} expenses={expenses} period={period} currency={currency} money={money} />}
          <section className="border-t border-[#d6d8e2] bg-[#ececf4] p-5"><h3 className="font-display text-xl">Gastos por categoría</h3><p className="mt-2 text-xs text-muted">{period} · {currency === 'UYU' ? 'Pesos uruguayos' : 'Dólares'}</p>{!loading && !error && <><p className="my-5 break-words text-2xl font-semibold">{money(expenses)}</p><div className="space-y-4">{categories.map(category => <div key={category.name}><div className="flex flex-wrap justify-between gap-2 text-xs"><span>{category.name}</span><span>{money(category.amount)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full" style={{ width: `${expenses ? category.amount / expenses * 100 : 0}%`, background: category.color }} /></div></div>)}</div></>}</section>
          {!loading && !error && <AccountManager accounts={accounts} transactionAccountIds={[...transactions.map(transaction => transaction.account_id), ...payments.flatMap(payment => [payment.source_account_id, payment.card_account_id])]} onChanged={() => setAttempt(value => value + 1)} />}
        </aside>
      </div>
      {showForm && <div className="fixed inset-0 z-30 overflow-y-auto bg-ink/30 px-5 py-8">
        <section role="dialog" aria-modal="true" aria-labelledby="movement-title" className="mx-auto w-full max-w-md rounded-lg bg-paper p-6 shadow-xl">
          <div className="flex items-center justify-between"><h2 id="movement-title" className="font-display text-2xl">{transactionType === 'income' ? 'Agregar ingreso' : 'Agregar egreso'}</h2><button disabled={busy} aria-label="Cerrar" onClick={() => setShowForm(false)}><X size={20} /></button></div>
          <div className="mt-5">
            {transactionType === 'expense' && <label className="block text-sm">Tipo de egreso<select disabled={busy} name="category" value={expenseCategory} onChange={event => { setExpenseCategory(event.target.value); setGroceryItems([]); setFormError('') }} className={inputClass}>{Object.keys(expenseCategories).map(category => <option key={category}>{category}</option>)}<option>Pagar tarjeta</option></select></label>}
            {transactionType === 'expense' && expenseCategory === 'Pagar tarjeta' ? <CardPaymentForm accounts={accounts} ready={paymentsReady} currency={currency} today={today} onBusyChange={setBusy} onSaved={() => { setShowForm(false); setAttempt(value => value + 1) }} /> : <form onSubmit={saveTransaction} className="mt-5"><fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
              {transactionType === 'income' && <label className="block text-sm">Tipo de ingreso<select name="subcategory" required defaultValue="Sueldo" className={inputClass}><option>Sueldo</option><option>Inversión Violeta</option><option>Alquiler</option><option>Otros</option></select></label>}
              <label className="block text-sm">Cuenta y moneda<select value={accountId} onChange={event => { setAccountId(event.target.value); setFirstPeriod('') }} required className={inputClass}>{formAccounts.map(account => <option key={account.id} value={account.id}>{accountName(account)}</option>)}</select></label>
              {(transactionType === 'income' || isGrocery || selectedAccount?.kind === 'credit') && <label className="block text-sm">{isGrocery ? 'Nombre del supermercado' : transactionType === 'expense' ? 'Comercio' : 'Concepto'}<input name="name" required pattern=".*\S.*" maxLength={70} placeholder={transactionType === 'expense' && !isGrocery ? 'Nombre del comercio' : undefined} className={inputClass} /></label>}
              {!isGrocery && <label className="block text-sm">{selectedAccount?.kind === 'credit' ? 'Importe total financiado' : 'Importe'} ({selectedAccount?.currency === 'UYU' ? '$' : 'u$s'})<input name="amount" type="number" min="0.01" max="100000000" step="0.01" required value={purchaseAmount} onChange={event => setPurchaseAmount(event.target.value)} className={inputClass} /></label>}
              <label className="block text-sm">{transactionType === 'income' ? 'Fecha del ingreso' : 'Fecha del egreso'}<input name="occurred_on" type="date" min={selectedAccount?.opening_date} max={today} value={purchaseDate} onChange={event => { setPurchaseDate(event.target.value); setFirstPeriod('') }} required className={inputClass} /></label>
              {transactionType === 'expense' && <>
                {isGrocery && <GroceryItems onChange={setGroceryItems} money={amount => money(amount, selectedAccount?.currency)} />}
                {!isGrocery && expenseCategories[expenseCategory]?.length > 0 && <label className="block text-sm">{expenseCategory === 'Gastos mensuales' ? 'Servicio mensual' : expenseCategory === 'Gastos anuales' ? 'Impuesto anual' : 'Subcategoría'}<select key={expenseCategory} name="subcategory" required className={inputClass}>{expenseCategories[expenseCategory].map(subcategory => <option key={subcategory}>{subcategory}</option>)}</select></label>}
                <label className="block text-sm">{expenseCategory === 'Supermercado' ? 'Qué compraste' : 'Detalle (opcional)'}<textarea name="detail" maxLength={500} rows={3} placeholder={expenseCategory === 'Supermercado' ? 'Ej.: leche, yogur y huevos' : 'Detalle del pago o de la salida'} className={inputClass} /></label>
              </>}
              {isVisa && <>
                <label className="block text-sm">Cantidad de cuotas<input type="number" required min="1" max="120" step="1" value={installmentCount} onChange={event => setInstallmentCount(event.target.value)} className={inputClass} /></label>
                <label className="block text-sm">Primer estado de cuenta<select required value={effectiveFirstPeriod} onChange={event => setFirstPeriod(event.target.value)} className={inputClass}><option value="" disabled>Selecciona un cierre</option>{eligibleStatements.map(statement => <option key={statement.id} value={statement.period}>Cierre {new Date(`${statement.closing_on}T12:00:00`).toLocaleDateString('es-UY')} · Vence {new Date(`${statement.due_on}T12:00:00`).toLocaleDateString('es-UY')}</option>)}</select></label>
                {preview.length > 0 && <div role="status" className="rounded-lg bg-mint p-3 text-sm"><p>Primera cuota: <strong>{money(preview[0].cents / 100, selectedAccount.currency)}</strong></p><p className="mt-1 text-xs">{preview.length} {preview.length === 1 ? 'pago' : 'cuotas'} · Total {money(movementAmount, selectedAccount.currency)}</p>{preview.some(installment => installment.cents !== preview[0].cents) && <p className="mt-1 text-xs">Puede haber diferencias de un centésimo por redondeo.</p>}</div>}
                <p className="text-xs leading-relaxed text-muted">Incluye intereses o recargos en el total financiado. Las fechas de los cierres futuros aún no confirmados quedan pendientes.</p>
              </>}
              <p className="text-xs leading-relaxed text-muted">Para registrar un pago ya realizado, selecciona «Pagar tarjeta» en Tipo de egreso. Las transferencias entre bancos aún no están habilitadas.</p>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#293e31] px-4 py-3 text-sm text-white">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}{busy ? 'Guardando…' : transactionType === 'income' ? 'Guardar ingreso' : 'Guardar egreso'}</button>
            </fieldset>{selectedAccount?.kind === 'credit' && !isVisa && <p className="mt-3 text-xs text-muted">Compra en un pago, contabilizada en el mes de compra. Esta tarjeta aún no tiene cierres ni cuotas configurados.</p>}{formError && <p role="alert" className="mt-4 text-sm text-[#b4452d]">{formError}</p>}</form>}
          </div>
        </section>
      </div>}
    </div>
  )
}