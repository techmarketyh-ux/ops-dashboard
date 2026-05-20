import Papa from 'papaparse'
import { ShopifyOrder } from '../types'

// Items que no son productos reales
const SKIP_ITEMS = [
  'envio', 'garantia', 'seguro', 'prioritario', 'proteccion', 'shipping'
]

function isSkippable(name: string): boolean {
  const lower = name.toLowerCase()
  return SKIP_ITEMS.some(s => lower.includes(s))
}

// Normaliza nombre de producto Shopify quitando variante (talla/color)
// "OEAK Brasier - Beige / L-XL" → "OEAK Brasier"
// "DryFit Camisa Hidrofobica - Negro / S" → "DryFit Camisa Hidrofobica"
export function normalizeShopifyProduct(name: string): string {
  // Quita variante después del primer " - " o antes de " / "
  const dashIdx = name.indexOf(' - ')
  if (dashIdx > 0) return name.substring(0, dashIdx).trim()
  const slashIdx = name.indexOf(' / ')
  if (slashIdx > 0) return name.substring(0, slashIdx).trim()
  return name.trim()
}

export function parseShopifyOrdersReport(text: string): ShopifyOrder[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true
  })

  const orders: ShopifyOrder[] = []

  for (const row of result.data) {
    const lineitem = String(row['Lineitem name'] || '').trim()
    if (!lineitem || isSkippable(lineitem)) continue

    // Id solo aparece en la primera línea de cada pedido (pedidos con varios items)
    const rawId = String(row['Id'] || '').trim()
    const name = String(row['Name'] || '').trim()
    const phone = String(row['Phone'] || row['Shipping Phone'] || '').replace(/\D/g, '').slice(-10)
    const clientName = String(row['Shipping Name'] || row['Billing Name'] || '').trim()
    const createdAt = String(row['Created at'] || '').slice(0, 10)
    const total = parseFloat(String(row['Total'] || row['Subtotal'] || '0')) || 0
    const product = normalizeShopifyProduct(lineitem)
    const qty = parseInt(String(row['Lineitem quantity'] || '1')) || 1

    orders.push({
      shopifyId: rawId || name,
      orderName: name,
      product,
      clientName,
      phone,
      createdAt,
      total,
      qty
    })
  }

  return orders
}

// Agrupa por producto para resumen
export function groupShopifyByProduct(orders: ShopifyOrder[]): Record<string, { orders: number; revenue: number }> {
  const result: Record<string, { orders: number; revenue: number }> = {}
  // Cuenta pedidos únicos por producto (un pedido puede tener varios items)
  const seen = new Set<string>()
  for (const o of orders) {
    const key = `${o.shopifyId}-${o.product}`
    if (seen.has(key)) continue
    seen.add(key)
    if (!result[o.product]) result[o.product] = { orders: 0, revenue: 0 }
    result[o.product].orders++
    result[o.product].revenue += o.total
  }
  return result
}
