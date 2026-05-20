import { NextRequest, NextResponse } from 'next/server'
import { parseTikTokReport, extractProductFromTikTok } from '@/lib/parsers/tiktok'
import { parseMetaReport, extractProductFromMeta } from '@/lib/parsers/meta'
import { parseRocketReport } from '@/lib/parsers/rocket'
import { parseShopifyReport } from '@/lib/parsers/shopify'
import { computeMetrics } from '@/lib/metrics'
import { buildAutoMappings } from '@/lib/matching'
import { AdSpend, RocketOrder, ShopifyProduct } from '@/lib/types'
import * as XLSX from 'xlsx'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const adminRaw = formData.get('adminCosts') as string || '{}'
    const adminCosts: { payroll: number; tools: number } = JSON.parse(adminRaw)

    let adSpends: AdSpend[] = []
    let rocketOrders: RocketOrder[] = []
    let shopifyProducts: ShopifyProduct[] = []

    // ── Paso 1: Parsea Meta y TikTok para extraer nombres de campaña ──────────
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

    // Nombres canónicos = los que vienen de las campañas
    const campaignNames = Array.from(new Set(adSpends.map(a => a.product).filter(Boolean)))

    // ── Paso 2: Parsea Shopify para extraer nombres de productos ──────────────
    const shopifyFiles = formData.getAll('shopify') as File[]
    for (const file of shopifyFiles) {
      const text = await file.text()
      shopifyProducts = [...shopifyProducts, ...parseShopifyReport(text)]
    }
    const shopifyNames = shopifyProducts.map(s => s.title)

    // ── Paso 3: Parsea Rocket para extraer nombres de productos ───────────────
    // Primera pasada: sin mapeo, solo para obtener nombres
    const rocketFiles = formData.getAll('rocket') as File[]
    const rocketNamesSet = new Set<string>()
    for (const file of rocketFiles) {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      for (const row of rows) {
        const name = String(row['PRODUCTOS'] || '').trim()
        if (name) rocketNamesSet.add(name)
      }
    }
    const rocketNames = Array.from(rocketNamesSet)

    // ── Paso 4: Construye mapeos automáticos ──────────────────────────────────
    const { rocketToCanonical, shopifyToCanonical } = buildAutoMappings(
      campaignNames,
      rocketNames,
      shopifyNames
    )

    // ── Paso 5: Parsea Rocket con mapeo real ──────────────────────────────────
    for (const file of rocketFiles) {
      const buf = await file.arrayBuffer()
      const orders = parseRocketReport(buf, rocketToCanonical)
      const orderMap = new Map(rocketOrders.map(o => [o.id, o]))
      for (const order of orders) {
        if (order.id) orderMap.set(order.id, order)
        else rocketOrders.push(order)
      }
      rocketOrders = Array.from(orderMap.values())
    }

    // ── Paso 6: Aplica mapeo a Shopify ────────────────────────────────────────
    shopifyProducts = shopifyProducts.map(p => ({
      ...p,
      title: shopifyToCanonical[p.title] || p.title
    }))

    // ── Paso 7: Calcula métricas ──────────────────────────────────────────────
    const metrics = computeMetrics(adSpends, rocketOrders, shopifyProducts, adminCosts)

    return NextResponse.json({ ok: true, metrics, mappings: { rocketToCanonical, shopifyToCanonical } })
  } catch (err) {
    console.error('[process]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
