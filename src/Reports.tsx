
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import AmountBars from './AmountBars'
import type { StoredGroceryItem } from './lib/grocery'

type Entry = { name: string; amount: number }

type GroceryPurchase = {
  id: string
  name: string
  occurred_on: string
  grocery_items?: StoredGroceryItem[] | null
}

type Props = {
  period: string
  currency: string
  incomes: Entry[]
  expenses: Entry[]
  groceries: GroceryPurchase[]
  money: (amount: number) => string
}

const chartColors = [
  '#6b8f71',
  '#d9a66f',
  '#8c78a8',
  '#6e9da5',
  '#d47c70',
  '#a6a65c',
  '#8a9bc0',
  '#c18caa',
  '#a58c70',
  '#729b91',
]

const cents = (amount: number) => Math.round(Number(amount) * 100)

export default function Reports({
  period,
  currency,
  incomes,
  expenses,
  groceries,
  money,
}: Props) {
  const products = [...groceries]
    .sort((first, second) =>
      second.occurred_on.localeCompare(first.occurred_on),
    )
    .flatMap(purchase =>
      (purchase.grocery_items ?? []).map((item, index) => ({
        ...item,
        id: `${purchase.id}_${index}`,
        store: purchase.name,
        date: purchase.occurred_on,
      })),
    )

  const missingDetails = groceries.filter(
    purchase => !purchase.grocery_items?.length,
  ).length

  const total = (entries: Entry[]) =>
    entries.reduce((sum, entry) => sum + cents(entry.amount), 0) / 100

  const groups = [
    {
      title: 'Ingresos',
      entries: incomes,
      icon: ArrowDownLeft,
      background: 'bg-mint',
      color: 'text-[#355c48]',
    },
    {
      title: 'Egresos',
      entries: expenses,
      icon: ArrowUpRight,
      background: 'bg-[#f8e6e1]',
      color: 'text-[#aa4936]',
    },
  ]

  // Agrupar productos por categoría
  const categoryGroups = Object.values(
    products.reduce<Record<string, typeof products>>((acc, product) => {
      const category = product.category?.trim() || 'Sin categoría'

      if (!acc[category]) {
        acc[category] = []
      }

      acc[category].push(product)
      return acc
    }, {}),
  )
    .map(items => ({
      name: items[0].category?.trim() || 'Sin categoría',
      products: items,
      amount:
        items.reduce((sum, product) => sum + cents(product.amount), 0) / 100,
    }))
    .sort((a, b) => b.amount - a.amount)

  // Total general de productos detallados
  const groceryTotal = categoryGroups.reduce(
    (sum, category) => sum + cents(category.amount),
    0,
  ) / 100

  // Datos para el gráfico circular
  let accumulated = 0

  const chartSegments = categoryGroups.map((category, index) => {
    const percentage =
      groceryTotal > 0 ? (category.amount / groceryTotal) * 100 : 0

    const start = accumulated
    accumulated += percentage

    return {
      ...category,
      percentage,
      color: chartColors[index % chartColors.length],
      start,
      end: accumulated,
    }
  })

  const chartGradient =
    chartSegments.length > 0 && groceryTotal > 0
      ? `conic-gradient(${chartSegments
        .map(
          segment =>
            `${segment.color} ${segment.start}% ${segment.end}%`,
        )
        .join(', ')})`
      : '#e5e7eb'

  return (
    <section aria-labelledby="reports-title" className="mt-5">
      <h2 id="reports-title" className="font-display text-2xl font-semibold">
        Reporte mensual
      </h2>

      <p className="mt-2 text-sm text-muted">
        {new Date(`${period}-01T12:00:00`).toLocaleDateString('es-UY', {
          month: 'long',
          year: 'numeric',
        })}{' '}
        · {currency === 'UYU' ? 'Pesos uruguayos ($)' : 'Dólares (u$s)'}
      </p>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-2">
        {groups.map(
          ({ title, entries, icon: Icon, background, color }) => (
            <section
              key={title}
              aria-label={`Reporte de ${title.toLowerCase()}`}
              className="min-w-0 lg:row-span-3 lg:grid lg:grid-rows-subgrid"
            >
              <article
                className={`min-w-0 rounded-lg p-5 ${background}`}
              >
                <h3
                  className={`flex items-center gap-2 text-sm font-medium ${color}`}
                >
                  <Icon size={18} />
                  Total de {title.toLowerCase()}
                </h3>

                <p className="mt-4 wrap-anywhere text-2xl font-semibold tabular-nums">
                  {money(total(entries))}
                </p>
              </article>

              <div className="mt-5 lg:mt-0">
                <h3 className="text-sm font-semibold">
                  {title} por categoría
                </h3>

                <dl className="mt-3 divide-y divide-line">
                  {entries.map(entry => (
                    <div
                      key={entry.name}
                      className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                    >
                      <dt className="min-w-0 wrap-break-word">
                        {entry.name}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {money(entry.amount)}
                      </dd>
                    </div>
                  ))}
                </dl>

                {entries.length === 0 && (
                  <p className="mt-4 text-sm text-muted">
                    Sin {title.toLowerCase()} en este mes y moneda.
                  </p>
                )}
              </div>

              <AmountBars
                title={`Gráfico de ${title.toLowerCase()} por categoría`}
                entries={entries}
                money={money}
              />
            </section>
          ),
        )}
      </div>

      {/* Reporte de supermercado */}
      <section
        aria-labelledby="grocery-report-title"
        className="mt-9 border-t border-line pt-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="grocery-report-title"
            className="font-display text-xl font-semibold"
          >
            Productos del supermercado
          </h2>

          <p className="text-lg font-bold text-[#aa4936] tabular-nums">
            {money(groceryTotal)}
          </p>
        </div>

        <p className="mt-2 text-xs text-muted">
          Compras realizadas en el mes seleccionado, agrupadas por categoría.
          Los productos de tickets en cuotas se muestran completos, no
          repartidos por cierre.
        </p>



        {categoryGroups.length > 0 ? (
          <>
            {/* Categorías desplegables */}
            <div className="mt-5 space-y-3">
              {categoryGroups.map(category => (
                <details
                  key={category.name}
                  className="overflow-hidden rounded-lg border border-line bg-white"
                >
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-[#f7f8f6]">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-semibold">
                        {category.name}
                      </span>
                      <span className="text-xs text-muted">
                        {category.products.length}{' '}
                        {category.products.length === 1
                          ? 'producto'
                          : 'productos'}
                      </span>
                    </div>

                    <span className="font-semibold tabular-nums">
                      {money(category.amount)}
                    </span>
                  </summary>

                  <div className="overflow-x-auto border-t border-line">
                    <table className="w-full min-w-[650px] border-collapse text-left text-xs">
                      <thead className="bg-[#eceeeb]">
                        <tr>
                          {[
                            'Fecha / Supermercado',
                            'Producto',
                            'Cantidad',
                            'Precio unitario',
                            'Total',
                          ].map((heading, index) => (
                            <th
                              key={heading}
                              scope="col"
                              className={`px-3 py-3 font-semibold ${index >= 2 ? 'text-right' : ''
                                }`}
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-line">
                        {category.products.map(product => (
                          <tr key={product.id}>
                            <td className="px-3 py-3 align-top">
                              <p>
                                {new Date(
                                  `${product.date}T12:00:00`,
                                ).toLocaleDateString('es-UY')}
                              </p>
                              <p className="mt-1 wrap-break-word text-muted">
                                {product.store}
                              </p>
                            </td>

                            <th
                              scope="row"
                              className="max-w-48 wrap-break-word px-3 py-3 align-top font-medium"
                            >
                              {product.name}
                            </th>

                            <td className="px-3 py-3 text-right align-top tabular-nums">
                              {product.quantity != null
                                ? new Intl.NumberFormat('es-UY', {
                                  maximumFractionDigits: 3,
                                }).format(product.quantity)
                                : 'Sin registrar'}
                            </td>

                            <td className="px-3 py-3 text-right align-top tabular-nums">
                              {product.unit_price != null
                                ? money(product.unit_price)
                                : 'Sin registrar'}
                            </td>

                            <td className="px-3 py-3 text-right align-top font-semibold tabular-nums">
                              {money(product.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot>
                        <tr className="border-t border-line">
                          <th
                            colSpan={4}
                            scope="row"
                            className="px-3 py-4 font-semibold"
                          >
                            Total de {category.name}
                          </th>
                          <td className="px-3 py-4 text-right font-semibold tabular-nums">
                            {money(category.amount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </details>
              ))}
            </div>

            {/* Gráfico circular */}
            <section
              aria-labelledby="grocery-chart-title"
              className="mt-8 rounded-lg border border-line p-5"
            >
              <h3
                id="grocery-chart-title"
                className="text-base font-semibold"
              >
                Distribución del gasto por categoría
              </h3>

              <p className="mt-1 text-xs text-muted">
                Porcentaje del importe total de los productos detallados.
              </p>

              <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                <div
                  role="img"
                  aria-label={`Gráfico circular de gastos por categoría. Total: ${money(groceryTotal)}`}
                  className="relative size-52 shrink-0 rounded-full"
                  style={{ background: chartGradient }}
                >
                  <div className="absolute inset-[27%] flex flex-col items-center justify-center rounded-full bg-white text-center">
                    <span className="text-xs text-muted">Total</span>
                    <span className="mt-1 max-w-full px-1 text-sm font-bold tabular-nums">
                      {money(groceryTotal)}
                    </span>
                  </div>
                </div>

                <div className="w-full min-w-0 space-y-3">
                  {chartSegments.map(segment => (
                    <div
                      key={segment.name}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="min-w-0 wrap-break-word">
                          {segment.name}
                        </span>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="font-semibold tabular-nums">
                          {segment.percentage.toFixed(1)}%
                        </span>
                        <span className="ml-2 text-xs text-muted tabular-nums">
                          {money(segment.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No hay productos detallados en este mes y moneda.
          </p>
        )}

        {missingDetails > 0 && (
          <p className="mt-3 text-xs text-muted">
            Tickets sin productos detallados: {missingDetails}.
          </p>
        )}
      </section>
    </section>
  )
}
