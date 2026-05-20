import * as XLSX from 'xlsx'
import { RocketOrder, RocketStatus } from '../types'

// Estados en tránsito = despachados pero no entregados ni devueltos
const IN_TRANSIT_STATES = new Set([
  'enviado', 'en ruta', 'recogida en agencia',
  'en tránsito', 'en transito',
  'novedad',
  'confirmado - pendiente de preparación',
  'confirmado - pendiente de preparacion'
])

export function classifyRocketStatus(raw: string): RocketStatus {
  const s = raw.toLowerCase().trim()
  if (s === 'entregado') return 'entregado'
  if (s.startsWith('devuelto')) return 'devuelto'
  if (IN_TRANSIT_STATES.has(s)) return 'en_transito'
  if (s === 'rechazado' || s === 'no confirmable' || s === 'duplicado') return 'no_confirmado'
  return 'pendiente'
}

function parseDate(val: unknown): string {
  if (!val) return ''
  const s = String(val).trim()
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return s.slice(0, 10)
}

export function parseRocketReport(
  buffer: ArrayBuffer,
  mappings: Record<string, string>
): RocketOrder[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const orders: RocketOrder[] = []

  for (const row of rows) {
    const rocketProduct = String(row['PRODUCTOS'] || '').trim()
    if (!rocketProduct) continue

    const rawStatus = String(row['ESTADO'] || '').trim()
    const status = classifyRocketStatus(rawStatus)
    const shopifyId = String(row['ID pedido Shopify'] || '').trim()
    const isManual = String(row['¿Confirmado manual?'] || '0').trim() === '1'
    const channel: 'shopify' | 'whatsapp' =
      shopifyId && shopifyId !== '0' && !isManual ? 'shopify' : 'whatsapp'
    const product = mappings[rocketProduct] || rocketProduct
    const carrier = String(row['TRANSPORTADORA'] || '').trim()

    orders.push({
      id: String(row['ID PEDIDO'] || '').trim(),
      product,
      rocketProduct,
      status,
      clientName: String(row['NOMBRE COMPLETO'] || '').trim(),
      phone: String(row['TELF'] || '').trim(),
      shopifyId,
      isManual,
      channel,
      price: parseFloat(String(row['PRECIO'] || 0)) || 0,
      productCost: parseFloat(String(row['COSTE DE PRODUCTOS (SIN IVA)'] || 0)) || 0,
      shippingCost: parseFloat(String(row['COSTE DE ENVÍO (SIN IVA)'] || 0)) || 0,
      totalCost: parseFloat(String(row['COSTE TOTAL PEDIDO'] || 0)) || 0,
      orderDate: parseDate(row['Fecha del pedido']),
      confirmDate: parseDate(row['Fecha confirmación']),
      carrier
    })
  }

  return orders
}
