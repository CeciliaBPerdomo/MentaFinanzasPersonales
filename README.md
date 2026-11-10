<div align="center">

# Menta

### Tu dinero, en equilibrio.

Finanzas personales, cuentas, tarjetas y metas en un mismo lugar.

**React 19 · TypeScript · Vite · Tailwind CSS 4 · Supabase**

[Funcionalidades](#funcionalidades) · [Tecnologías](#tecnologías) · [Instalación](#instalación) · [Despliegue](#despliegue-en-vercel)

</div>

---

## Qué Es Menta

Menta es una aplicación web para organizar las finanzas personales: saber cuánto dinero hay en cada cuenta, registrar ingresos y egresos, planificar las cuotas de la tarjeta y seguir objetivos de ahorro.

Fue creada para el uso personal de **Cecilia Perdomo**, con cuentas en **pesos uruguayos (UYU)** y **dólares estadounidenses (USD)**. Cada moneda se mantiene separada, sin conversiones automáticas ni totales que mezclen pesos con dólares.

La interfaz es responsive, con navegación lateral, gráficos y una identidad visual de tonos menta, lima y coral. El diseño inicial tomó como referencia [public/Board.jpg](public/Board.jpg).

> Menta registra operaciones realizadas por la persona usuaria. No se conecta a los bancos, no ejecuta pagos y no solicita números de tarjeta, CVV ni credenciales bancarias.

## Funcionalidades

### Panorama Financiero

- Disponible actual desglosado en **Prex**, **BROU** y total de ambas cuentas, según la moneda seleccionada.
- Resumen mensual de ingresos y egresos.
- Deuda de Visa BBVA por mes, en pesos y dólares, con arrastre del saldo pendiente y descuento de pagos registrados.
- Saldos actuales por institución, con ambas monedas en una misma tabla.
- Opción para ocultar importes y actualizar la información desde Supabase.

### Ingresos Y Egresos

- Formularios separados para agregar ingresos y egresos con cuenta, moneda y fecha.
- Ingresos clasificados como **Sueldo**, **Inversión Violeta**, **Alquiler** u **Otros**, conservando el concepto.
- Egresos de supermercado, gastos mensuales, gastos anuales, gastos de casa, salidas y diversión, compras, servicios y otros.
- Servicios predefinidos: UTE, ANTEL, OSE, BPS, ANCEL y Seguridad Norpe.
- Impuestos anuales: Impuesto a Primaria y Contribución Inmobiliaria.
- Consulta por mes y moneda, búsqueda de movimientos y eliminación con confirmación.

### Supermercado

Cada ticket puede incluir el nombre del supermercado y varios productos. Por producto se registra nombre, categoría, cantidad y precio unitario. Al completar una fila aparece otra y el total se calcula automáticamente.

Los productos quedan asociados a **un único egreso**, evitando duplicar el gasto del ticket. Los registros antiguos sin cantidad o precio unitario se muestran como **Sin registrar** en esos campos.

### Tarjetas Y Cuotas

- Compras Visa BBVA con comercio, importe total financiado, cantidad de cuotas y primer estado de cuenta.
- Alta de cierres con fechas reales de cierre y vencimiento.
- Cuotas y gráficos por comercio, separados en pesos y dólares.
- Proyección de cuotas posteriores; las fechas no confirmadas no se inventan.
- Distribución de importes en centésimos para conservar el total exacto de la compra.
- Opción **Pagar tarjeta** dentro del formulario de egresos.

Un pago de tarjeta reduce el saldo del banco y la deuda de la tarjeta, **sin generar otro ingreso ni otro gasto**. Los pagos aparecen en la lista habitual de movimientos y pueden eliminarse con confirmación.

### Metas De Ahorro

- **Reforma de la casa:** objetivo de USD 10.000, cuyo progreso se calcula desde el saldo actual de BROU en dólares.
- **Inversiones:** objetivo de USD 1.000, con saldo inicial propuesto de USD 781,63 y actualización manual desde la tarjeta.
- Barras de progreso e importe faltante para cada objetivo.

### Reportes Y Gráficos

- Vista de Reportes con filtros de mes y moneda.
- Columnas de ingresos y egresos con totales, desglose y gráficos por categoría.
- Detalle de productos de supermercado con fecha, local, cantidad, precio unitario y total.
- Gráfico circular de ingresos, egresos y balance mensual en el espacio personal.
- Gráficos de cuotas por comercio y saldos por cuenta, distinguiendo deuda de dinero disponible.

### Acceso Y Administración

- Registro, confirmación por correo, inicio y cierre de sesión.
- Recuperación de acceso y establecimiento de contraseña desde invitaciones o enlaces de recuperación.
- Alta de cuentas bancarias y tarjetas por moneda.
- Eliminación de cuentas sin historial, con confirmación. Las cuentas vinculadas a movimientos o pagos se conservan para proteger sus registros.

## Tecnologías

| Tecnología | Para Qué Se Utiliza |
|---|---|
| **React 19** | Componentes, formularios, navegación entre vistas y actualización de la interfaz. |
| **TypeScript** | Tipado de cuentas, movimientos, cuotas, pagos y componentes. |
| **Vite 7** | Servidor de desarrollo y compilación optimizada para producción. |
| **Tailwind CSS 4** | Estilos utilitarios, distribución responsive y tema visual. |
| **Supabase Auth** | Autenticación y recuperación de cuentas. |
| **PostgreSQL en Supabase** | Persistencia de cuentas, movimientos, metas, cierres y pagos. |
| **Supabase JavaScript SDK** | Consultas y operaciones desde la aplicación autenticada. |
| **Row Level Security (RLS)** | Reglas de acceso que limitan cada usuario a sus propios registros. |
| **Lucide React** | Iconos de navegación y acciones. |
| **ESLint** | Revisión estática del código y reglas de React. |
| **CSS y APIs del navegador** | Gráficos de barras y circular, formato de monedas y fechas. |
| **Google Fonts** | Tipografías Manrope y Plus Jakarta Sans. |

Los gráficos están construidos con componentes React y CSS, sin una biblioteca adicional de gráficos. La navegación actual alterna vistas dentro de la aplicación, sin un router de URLs.

## Cómo Se Calculan Los Importes

| Dato | Criterio |
|---|---|
| Saldo de cuenta | Saldo inicial + movimientos + efecto de pagos de tarjeta. |
| Ingresos mensuales | Ingresos registrados en ese mes y moneda. |
| Egresos bancarios | Fecha del movimiento de la cuenta. |
| Gastos de Visa BBVA | Cuota correspondiente al mes del cierre, no el total de la compra. |
| Pendiente mensual de Visa | Deuda inicial confirmada + cuotas acumuladas hasta el mes seleccionado − pagos registrados hasta ese mes. |
| Productos del supermercado | Fecha de compra del ticket, aunque se pague en cuotas. |

Los cálculos monetarios utilizan centésimos para las sumas y el reparto de cuotas. El arrastre de deuda no vuelve a sumarse como gasto mensual.

## Instalación

### Requisitos

- **Node.js 22.x** recomendado y npm.
- Un proyecto de Supabase con acceso al SQL Editor.
- Un navegador actualizado.

Desde la carpeta que contiene [package.json](package.json):

```bash
npm install
```

Crea un archivo `.env.local` en esa misma carpeta siguiendo [.env.example](.env.example):

```dotenv
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu-clave-publicable
```

Usa únicamente la URL del proyecto y la **clave publicable**. Nunca incluyas una contraseña de base de datos, una clave secreta ni una clave `service_role` en el frontend.

El archivo `.env.local` está excluido de Git. Las variables `VITE_` se incorporan al código enviado al navegador: la privacidad de los datos depende de la autenticación y de las políticas RLS, no de ocultar la clave publicable.

### Preparar Supabase

En una **base nueva**, ejecuta los scripts del SQL Editor en este orden:

| Orden | Script | Función |
|---|---|---|
| 1 | [supabase/schema.sql](supabase/schema.sql) | Movimientos, metas y políticas RLS iniciales. |
| 2 | [supabase/accounts-and-currencies.sql](supabase/accounts-and-currencies.sql) | Cuentas, saldos iniciales y monedas. |
| 3 | [supabase/visa-installments.sql](supabase/visa-installments.sql) | Cierres de Visa y planes de cuotas. |
| 4 | [supabase/expense-categories.sql](supabase/expense-categories.sql) | Categorías, subcategorías y detalle. |
| 5 | [supabase/grocery-items.sql](supabase/grocery-items.sql) | Productos dentro del ticket de supermercado. |
| 6 | [supabase/house-expenses.sql](supabase/house-expenses.sql) | Categoría Gastos casa. |
| 7 | [supabase/manage-accounts.sql](supabase/manage-accounts.sql) | Otras instituciones bancarias y tarjetas. |
| 8 | [supabase/card-payments.sql](supabase/card-payments.sql) | Pagos de tarjeta vinculados a ambas cuentas. |

> Estos scripts son incrementales y no todos admiten repetición. En un proyecto ya configurado, ejecuta únicamente los pendientes. Publicar una nueva versión de la app no ejecuta estos archivos automáticamente.

En **Authentication**, habilita Email y configura **URL Configuration** con la dirección donde se ejecutará la app. Para desarrollo en el puerto usado por este proyecto:

```text
Site URL:      http://127.0.0.1:5174
Redirect URL:  http://127.0.0.1:5174/**
```

Inicia el servidor:

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

Si usas otra dirección o puerto, actualiza también las URLs permitidas en Supabase. Tras cambiar variables de entorno, reinicia el servidor de desarrollo.

### Comandos Disponibles

| Comando | Resultado |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm run build` | Comprueba TypeScript y genera la aplicación en `dist`. |
| `npm run preview` | Sirve la compilación local para revisarla. |
| `npm run lint` | Ejecuta ESLint. |

## Despliegue En Vercel

1. Importa el repositorio y selecciona **Vite** como framework.
2. Usa la carpeta que contiene [package.json](package.json) como **Root Directory**.
3. Configura **Build Command** como `npm run build` y **Output Directory** como `dist`.
4. Añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` a las variables de entorno.
5. Publica y agrega el dominio HTTPS definitivo a Site URL y Redirect URLs de Supabase.

Los enlaces de autenticación utilizan el dominio desde donde se abre la aplicación. La navegación actual no necesita reglas de reescritura para rutas como `/reportes`, porque esas rutas todavía no existen.

Vercel genera un despliegue nuevo al recibir cambios en la rama configurada. Si cambias variables de entorno, realiza un **Redeploy**. Los datos permanecen en Supabase y no se borran al actualizar el frontend.

## Organización Del Proyecto

```text
public/                         Avatar y referencia visual
src/
  main.tsx                      Entrada de React
  AuthGate.tsx                  Acceso y sesión de Supabase
  RealDashboard.tsx             Panel principal y navegación
  Reports.tsx                   Reportes mensuales y productos
  VisaSummary.tsx               Cuotas y comercios por cierre
  AddStatement.tsx              Alta de cierres
  CardPaymentForm.tsx           Registro de pagos de tarjeta
  CardPaymentManager.tsx        Movimiento de pago y eliminación
  AccountManager.tsx            Administración de cuentas
  GroceryItems.tsx              Productos del ticket
  HouseGoal.tsx                 Meta de reforma desde BROU
  InvestmentGoal.tsx            Meta de inversiones
  AmountBars.tsx                Gráficos de barras
  MonthlyDonut.tsx              Gráfico circular mensual
  lib/                          Supabase y cálculos financieros
supabase/                       Scripts SQL incrementales
```

## Alcance Actual

- **Configuración personal:** la identidad, las metas y algunas reglas están adaptadas a Cecilia. No es todavía un producto multiusuario configurable, aunque los datos de la base se aíslan por usuario.
- **Base de deuda:** el cálculo de Visa parte de saldos iniciales confirmados para noviembre de 2026. La inicialización incluye cierres de noviembre y diciembre de 2026; los siguientes se agregan desde la app.
- **Otras tarjetas:** admiten compras en un pago por fecha de compra. Sus cierres y cuotas todavía no tienen la configuración específica de Visa BBVA.
- **Pagos de tarjeta:** banco y tarjeta deben tener la misma moneda. No se admiten pagos con conversión cambiaria ni transferencias entre bancos.
- **Servicios e impuestos:** las opciones facilitan registrar pagos, pero no generan cargos periódicos automáticos.
- **Intereses y comisiones:** no se calculan automáticamente. El importe financiado debe incluir los recargos conocidos.
- **Respaldo:** la aplicación no incorpora todavía exportación ni un mecanismo propio de copias de seguridad.
- **Verificación:** dispone de compilación TypeScript y ESLint. No incluye una suite automatizada de pruebas persistente.

---

<div align="center">

**Menta · Finanzas personales de Cecilia Perdomo**

Una visión más clara de lo que entra, lo que sale y lo que quieres construir.

</div>