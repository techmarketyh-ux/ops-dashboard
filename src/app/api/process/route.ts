import { NextRequest, NextResponse } from 'next/server'
import { parseTikTokReport } from '@/lib/parsers/tiktok'
import { parseMetaReport } from '@/lib/parsers/meta'
import { parseRocketReport } from '@/lib/parsers/rocket'
import { parseShopifyOrdersReport } from '@/lib/parsers/shopify'
import { computeMetrics, canonicalCampaignName } from '@/lib/metrics'
import { buildAutoMappings } from '@/lib/matching'
import { AdSpend, RocketOrder, ShopifyOrder } from '@/lib/types'
import * as XLSX from 'xlsx'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const adminRaw = formData.get('adminCosts') as string || '{}'
    const adminCosts: { payroll: number; tools: number } = JSON.parse(adminRaw)

    let adSpends: AdSpend[] = []
    let rocketOrders: RocketOrder[] = []
    let shopifyOrders: ShopifyOrder[] = []

    // Parse Meta
    for (const file of formData.getAll('meta') as File[]) {
      adSpends = [...adSpends, ...parseMetaReport(await file.arrayBuffer())]
    }

    // Parse TikTok
    for (const file of formData.getAll('tiktok') as File[]) {
      adSpends = [...adSpends, ...parseTikTokReport(await file.arrayBuffer())]
    }

    // Canonical campaign names
    const campaignNames = Array.from(new Set(
      adSpends.map(a => canonicalCampaignName(a.product)).filter(Boolean)
    ))

    // Parse Shopify orders CSV
    for (const file of formData.getAll('shopify') as File[]) {
      shopifyOrders = [...shopifyOrders, ...parseShopifyOrdersReport(await file.text())]
    }

    // Get Rocket product names for auto-mapping
    const rocketNamesSet = new Set<string>()
    const rocketBuffers: ArrayBuffer[] = []
    for (const file of formData.getAll('rocket') as File[]) {
      const buf = await file.arrayBuffer()
      rocketBuffers.push(buf)
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      for (const row of rows) {
        const name = String(row['PRODUCTOS'] || '').trim()
        if (name) rocketNamesSet.add(name)
      }
    }

    // Shopify product names from orders
    const shopifyProductNames = Array.from(new Set(shopifyOrders.map(o => o.product)))

    // Auto-mapping
    const { rocketToCanonical, shopifyToCanonical } = buildAutoMappings(
      campaignNames,
      Array.from(rocketNamesSet),
      shopifyProductNames
    )

    // Parse Rocket with mappings
    for (const buf of rocketBuffers) {
      const orders = parseRocketReport(buf, rocketToCanonical)
      const orderMap = new Map(rocketOrders.map(o => [o.id, o]))
      for (const order of orders) {
        if (order.id) orderMap.set(order.id, order)
        else rocketOrders.push(order)
      }
      rocketOrders = Array.from(orderMap.values())
    }

    // Apply Shopify product mappings
    shopifyOrders = shopifyOrders.map(o => ({
      ...o,
      product: shopifyToCanonical[o.product] || canonicalCampaignName(o.product)
    }))

    const metrics = computeMetrics(adSpends, rocketOrders, shopifyOrders, adminCosts)

    return NextResponse.json({ ok: true, metrics, mappings: { rocketToCanonical, shopifyToCanonical } })
  } catch (err) {
    console.error('[process]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
