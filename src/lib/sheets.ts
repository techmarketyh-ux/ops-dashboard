import { google } from 'googleapis'
import { GeneralMetrics, ProductMetrics } from './types'

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}')
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || ''

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getSheets() {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

async function getSheetNames(sheets: ReturnType<typeof google.sheets>): Promise<string[]> {
  const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  return (res.data.sheets || []).map(s => s.properties?.title || '')
}

async function createSheet(sheets: ReturnType<typeof google.sheets>, title: string) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }]
    }
  })
}

async function writeRange(
  sheets: ReturnType<typeof google.sheets>,
  range: string,
  values: (string | number)[][]
) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  })
}

async function clearRange(sheets: ReturnType<typeof google.sheets>, range: string) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range
  })
}

// ── Escribir hoja de un producto ────────────────────────────────────────────

async function writeProductSheet(
  sheets: ReturnType<typeof google.sheets>,
  m: ProductMetrics,
  existingSheets: string[]
) {
  const sheetName = m.product.substring(0, 50)

  if (!existingSheets.includes(sheetName)) {
    await createSheet(sheets, sheetName)
  }

  const rows: (string | number)[][] = [
    // Encabezado Shopify
    ['PEDIDOS SHOPIFY'],
    ['Gasto Ads', 'Pedidos Shopify', 'CPA', 'Despachados', '% Confirmación', 'CPA Real'],
    [
      m.shopifySpend.toFixed(2),
      m.shopifyOrders,
      m.shopifyCPA.toFixed(2),
      m.shopifyDispatched,
      (m.shopifyConfirmRate / 100).toFixed(4),
      m.shopifyCPAReal.toFixed(2)
    ],
    [],
    // Encabezado WhatsApp
    ['PEDIDOS WHATSAPP'],
    ['Gasto Ads', 'Conversaciones', 'Costo/Conv.', 'Despachados', 'CPA Real', '% Cierre'],
    [
      m.whatsSpend.toFixed(2),
      m.whatsConversations,
      m.whatsCAC.toFixed(2),
      m.whatsDispatched,
      m.whatsCPAReal.toFixed(2),
      (m.whatsCloseRate / 100).toFixed(4)
    ],
    [],
    // Logística
    ['LOGÍSTICA'],
    ['Total Pedidos', 'Entregados', 'En Tránsito', 'Devueltos', 'Pendientes', 'No Confirmados', '% Entrega'],
    [
      m.totalOrders,
      m.delivered,
      m.inTransit,
      m.returned,
      m.pending,
      m.notConfirmed,
      (m.deliveryRate / 100).toFixed(4)
    ],
    [],
    // Rentabilidad
    ['RENTABILIDAD'],
    ['Recaudo', 'Costo Producto', 'Flete Entregados', 'Flete Devueltos', 'Fulfillment', 'Gasto Ads', 'Profit Neto', 'ROI', 'Margen Neto'],
    [
      m.revenue.toFixed(2),
      m.productCost.toFixed(2),
      m.shippingCostDelivered.toFixed(2),
      m.shippingCostReturned.toFixed(2),
      m.fulfillment.toFixed(2),
      m.totalAdSpend.toFixed(2),
      m.netProfit.toFixed(2),
      m.roi.toFixed(4),
      (m.netMargin / 100).toFixed(4)
    ]
  ]

  await clearRange(sheets, `${sheetName}!A1:Z100`)
  await writeRange(sheets, `${sheetName}!A1`, rows)
}

// ── Escribir hoja general ────────────────────────────────────────────────────

async function writeGeneralSheet(
  sheets: ReturnType<typeof google.sheets>,
  metrics: GeneralMetrics,
  existingSheets: string[]
) {
  const sheetName = 'TABLA GENERAL'
  if (!existingSheets.includes(sheetName)) {
    await createSheet(sheets, sheetName)
  }

  const rows: (string | number)[][] = [
    ['GENERAL DE OPERACIÓN'],
    ['Gasto Total Ads', 'Recaudo Total', 'Total Despachados', 'Total Entregados', 'Total Devueltos', '% Entrega'],
    [
      metrics.totalSpend.toFixed(2),
      metrics.totalRevenue.toFixed(2),
      metrics.totalDispatched,
      metrics.totalDelivered,
      metrics.totalReturned,
      (metrics.deliveryRate / 100).toFixed(4)
    ],
    [],
    ['RENTABILIDAD GENERAL'],
    ['Profit Neto (sin admin)', 'Nómina', 'Herramientas', 'Profit Neto General', 'Capital Acumulado', 'ROI General'],
    [
      metrics.netProfitPerProduct.toFixed(2),
      metrics.adminCosts.payroll.toFixed(2),
      metrics.adminCosts.tools.toFixed(2),
      metrics.netProfitGeneral.toFixed(2),
      metrics.accumulatedCapital.toFixed(2),
      metrics.roiGeneral.toFixed(4)
    ],
    [],
    ['PROYECCIONES (pedidos en tránsito)'],
    ['40% entrega', '50% entrega', '60% entrega', '70% entrega'],
    [
      metrics.projections.rate40.toFixed(2),
      metrics.projections.rate50.toFixed(2),
      metrics.projections.rate60.toFixed(2),
      metrics.projections.rate70.toFixed(2)
    ],
    [],
    ['POR PRODUCTO'],
    ['Producto', 'Gasto Ads', 'Despachados', 'Entregados', '% Entrega', 'Profit Neto', 'ROI', 'Margen Neto'],
    ...metrics.products.map(p => [
      p.product,
      p.totalAdSpend.toFixed(2),
      p.shopifyDispatched + p.whatsDispatched,
      p.delivered,
      (p.deliveryRate / 100).toFixed(4),
      p.netProfit.toFixed(2),
      p.roi.toFixed(4),
      (p.netMargin / 100).toFixed(4)
    ])
  ]

  await clearRange(sheets, `${sheetName}!A1:Z200`)
  await writeRange(sheets, `${sheetName}!A1`, rows)
}

// ── Punto de entrada principal ───────────────────────────────────────────────

export async function syncToSheets(metrics: GeneralMetrics) {
  const sheets = await getSheets()
  const existingSheets = await getSheetNames(sheets)

  // Hoja general
  await writeGeneralSheet(sheets, metrics, existingSheets)

  // Una hoja por producto
  for (const product of metrics.products) {
    await writeProductSheet(sheets, product, existingSheets)
    // Refresca la lista después de crear
    if (!existingSheets.includes(product.product.substring(0, 50))) {
      existingSheets.push(product.product.substring(0, 50))
    }
  }
}
