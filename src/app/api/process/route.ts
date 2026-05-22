import { NextRequest, NextResponse } from 'next/server'
import { parseTikTokReport } from '@/lib/parsers/tiktok'
import { parseMetaReport } from '@/lib/parsers/meta'
import { parseRocketReport } from '@/lib/parsers/rocket'
import { parseShopifyOrdersReport } from '@/lib/parsers/shopify'
import { parseMappingsCSV, buildRocketMap, buildShopifyMap } from '@/lib/parsers/mappings'
import { computeMetrics, canonicalCampaignName } from '@/lib/metrics'
import { AdSpend, RocketOrder, ShopifyOrder } from '@/lib/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const adminRaw = formData.get('adminCosts') as string || '{}'
    const adminCosts: { payroll: number; tools: number } = JSON.parse(adminRaw)

    let adSpends: AdSpend[] = []
    let rocketOrders: RocketOrder[] = []
    let shopifyOrders: ShopifyOrder[] = []
    let rocketMap: Record<string, string> = {}
    let shopifyMap: Record<string, string> = {}

    // Parse mappings CSV
    for (const file of formData.getAll('mappings') as File[]) {
      const maps = parseMappingsCSV(await file.text())
      rocketMap = { ...rocketMap, ...buildRocketMap(maps) }
      shopifyMap = { ...shopifyMap, ...buildShopifyMap(maps) }
    }

    // Parse Meta — daily dates
    for (const file of formData.getAll('meta') as File[]) {
      adSpends = [...adSpends, ...parseMetaReport(await file.arrayBuffer())]
    }

    // Parse TikTok — daily dates
    for (const file of formData.getAll('tiktok') as File[]) {
      adSpends = [...adSpends, ...parseTikTokReport(await file.arrayBuffer())]
    }

    // Apply canonical names to adSpends
    adSpends = adSpends.map(a => ({ ...a, product: canonicalCampaignName(a.product) }))

    // Parse Shopify orders
    for (const file of formData.getAll('shopify') as File[]) {
      shopifyOrders = [...shopifyOrders, ...parseShopifyOrdersReport(await file.text())]
    }
    shopifyOrders = shopifyOrders.map(o => ({
      ...o,
      product: shopifyMap[o.product] || canonicalCampaignName(o.product)
    }))

    // Parse Rocket
    for (const file of formData.getAll('rocket') as File[]) {
      const buf = await file.arrayBuffer()
      const orders = parseRocketReport(buf, rocketMap)
      const orderMap = new Map(rocketOrders.map(o => [o.id, o]))
      for (const order of orders) {
        if (order.id) orderMap.set(order.id, order)
        else rocketOrders.push(order)
      }
      rocketOrders = Array.from(orderMap.values())
    }

    const metrics = computeMetrics(adSpends, rocketOrders, shopifyOrders, adminCosts)

    // Return raw data for client-side filtering
    return NextResponse.json({
      ok: true,
      metrics,
      rawData: { adSpends, rocketOrders, shopifyOrders }
    })
  } catch (err) {
    console.error('[process]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
