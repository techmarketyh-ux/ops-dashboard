import Papa from 'papaparse'
import { ShopifyOrder } from '../types'

const SKIP_ITEMS = ['envio', 'garantia', 'seguro', 'prioritario', 'proteccion', 'shipping', 'brocas', 'caladora']

function isSkippable(name: string): boolean {
  const lower = name.toLowerCase()
  return SKIP_ITEMS.some(s => lower.includes(s))
}

// "OEAK Brasier - Beige / L-XL" → "OEAK Brasier"
export function normalizeShopifyProduct(name: string): string {
  const dashIdx = name.indexOf(' - ')
  if (dashIdx > 0) return name.substring(0, dashIdx).trim()
  const slashIdx = name.indexOf(' / ')
  if (slashIdx > 0) return name.substring(0, slashIdx).trim()
  // Remove promo suffixes like "Promocion 2x1", "2x1"
  return name.replace(/\s*(Promocion\s*)?(2x1|3x1|pack\s*\d+).*/gi, '').trim()
}

export function parseShopifyOrdersReport(text: string): ShopifyOrder[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true
  })

  const orders: ShopifyOrder[] = []
  let currentId = ''
  let currentName = ''
  let currentPhone = ''
  let currentClientName = ''
  let currentCreatedAt = ''
  let currentTotal = 0

  for (const row of result.data) {
    const lineitem = String(row['Lineitem name'] || '').trim()
    if (!lineitem) continue

    // Propagate order-level fields — only update when a new order starts (Name changes or Id present)
    const rawId = String(row['Id'] || '').trim()
    const name = String(row['Name'] || '').trim()

    if (rawId && rawId !== 'NaN' && rawId !== 'undefined') {
      currentId = rawId.replace('.0', '')
    }
    if (name && name !== currentName) {
      currentName = name
      currentPhone = String(row['Phone'] || row['Shipping Phone'] || '').replace(/\D/g, '').slice(-10)
      currentClientName = String(row['Shipping Name'] || row['Billing Name'] || '').trim()
      currentCreatedAt = String(row['Created at'] || '').slice(0, 10)
      currentTotal = parseFloat(String(row['Total'] || row['Subtotal'] || '0')) || 0
    }

    if (isSkippable(lineitem)) continue

    const product = normalizeShopifyProduct(lineitem)
    if (!product) continue

    const qty = parseInt(String(row['Lineitem quantity'] || '1')) || 1

    orders.push({
      shopifyId: currentId || currentName,
      orderName: currentName,
      product,
      clientName: currentClientName,
      phone: currentPhone,
      createdAt: currentCreatedAt,
      total: currentTotal,
      qty
    })
  }

  return orders
}

export function groupShopifyByProduct(orders: ShopifyOrder[]): Record<string, { orders: number; revenue: number }> {
  const result: Record<string, { orders: number; revenue: number }> = {}
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
