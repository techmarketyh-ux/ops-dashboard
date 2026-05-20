import { NextRequest, NextResponse } from 'next/server'
import { parseTikTokReport } from '@/lib/parsers/tiktok'
import { parseMetaReport } from '@/lib/parsers/meta'
import { parseRocketReport } from '@/lib/parsers/rocket'
import { parseShopifyReport } from '@/lib/parsers/shopify'
import { computeMetrics } from '@/lib/metrics'
import { AdSpend, RocketOrder, ShopifyProduct } from '@/lib/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const mappingsRaw = formData.get('mappings') as string || '{}'
    const mappings: Record<string, string> = JSON.parse(mappingsRaw)

    const adminRaw = formData.get('adminCosts') as string || '{}'
    const adminCosts: { payroll: number; tools: number } = JSON.parse(adminRaw)

    let adSpends: AdSpend[] = []
    let rocketOrders: RocketOrder[] = []
    let shopifyProducts: ShopifyProduct[] = []

    const metaFiles = formData.getAll('meta') as File[]
    for (const file of metaFiles) {
      const buf = await file.arrayBuffer()
      adSpends = [...adSpends, ...parseMetaReport(buf)]
    }

    const tiktokFiles = formData.getAll('tiktok') as File[]
    for (const file of tiktokFiles) {
      const buf = await file.arrayBuffer()
      adSpends = [...adSpends, ...parseTikTokReport(buf)]
    }

    const rocketFiles = formData.getAll('rocket') as File[]
    for (const file of rocketFiles) {
      const buf = await file.arrayBuffer()
      const orders = parseRocketReport(buf, mappings)
      const orderMap = new Map(rocketOrders.map(o => [o.id, o]))
      for (const order of orders) {
        if (order.id) orderMap.set(order.id, order)
        else rocketOrders.push(order)
      }
      rocketOrders = Array.from(orderMap.values())
    }

    const shopifyFiles = formData.getAll('shopify') as File[]
    for (const file of shopifyFiles) {
      const text = await file.text()
      shopifyProducts = [...shopifyProducts, ...parseShopifyReport(text)]
    }

    const metrics = computeMetrics(adSpends, rocketOrders, shopifyProducts, adminCosts)

    return NextResponse.json({ ok: true, metrics })
  } catch (err) {
    console.error('[process]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
