import { AdSpend, RocketOrder, ShopifyOrder, ProductMetrics, GeneralMetrics } from './types'
import { groupShopifyByProduct } from './parsers/shopify'

const FULFILLMENT_COST = 0.85

export function colorCPA(val: number): string {
  if (val <= 4) return 'green'; if (val <= 6.9) return 'yellow'; return 'red'
}
export function colorConfirmRate(val: number): string {
  if (val <= 50) return 'red'; if (val <= 69) return 'yellow'; return 'green'
}
export function colorCPAReal(val: number): string {
  if (val <= 5) return 'green'; if (val <= 7.5) return 'yellow'; return 'red'
}
export function colorCostPerConv(val: number): string {
  if (val <= 0.20) return 'green'; if (val <= 0.39) return 'blue'
  if (val <= 0.60) return 'yellow'; return 'red'
}
export function colorCloseRate(val: number): string {
  if (val < 5) return 'red'; if (val < 7) return 'yellow'
  if (val <= 10) return 'blue'; return 'green'
}

export function normalizeProduct(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

// Estandariza nombre de producto de campaña quitando sufijos como CARP 2, Copy 1 of, etc.
export function canonicalCampaignName(name: string): string {
  return name
    .replace(/\s+carp\s*\d+/gi, '')
    .replace(/^copy\s+\d+\s+of\s+/i, '')
    .replace(/\s*-\s*copia\s*\d*/gi, '')
    .replace(/\s*copia\s*\d*/gi, '')
    .trim()
}

export function computeMetrics(
  adSpends: AdSpend[],
  rocketOrders: RocketOrder[],
  shopifyOrders: ShopifyOrder[],
  adminCosts: { payroll: number; tools: number }
): GeneralMetrics {

  // Estandariza nombres de campaña
  const normalizedSpends = adSpends.map(a => ({
    ...a,
    product: canonicalCampaignName(a.product)
  }))

  const shopifyByProduct = groupShopifyByProduct(shopifyOrders)

  // Productos únicos
  const productSet = new Set<string>()
  normalizedSpends.forEach(a => productSet.add(a.product))
  rocketOrders.forEach(o => productSet.add(canonicalCampaignName(o.product)))
  Object.keys(shopifyByProduct).forEach(p => productSet.add(p))

  const products: ProductMetrics[] = []

  for (const product of Array.from(productSet)) {
    if (!product || product === 'sin-mes' || product === 'sin-fecha') continue

    const productAds = normalizedSpends.filter(a =>
      normalizeProduct(a.product) === normalizeProduct(product)
    )
    const shopifySpend = productAds.filter(a => a.channel === 'shopify').reduce((s, a) => s + a.spend, 0)
    const whatsSpend = productAds.filter(a => a.channel === 'whatsapp').reduce((s, a) => s + a.spend, 0)
    const whatsConversations = productAds.filter(a => a.channel === 'whatsapp').reduce((s, a) => s + (a.conversations || 0), 0)
    const totalAdSpend = shopifySpend + whatsSpend

    // Shopify orders matched by product name
    const shopifyData = Object.entries(shopifyByProduct).find(([k]) =>
      normalizeProduct(k) === normalizeProduct(product)
    )
    const shopifyOrders2 = shopifyData?.[1]?.orders || 0

    // Rocket orders
    const orders = rocketOrders.filter(o =>
      normalizeProduct(canonicalCampaignName(o.product)) === normalizeProduct(product)
    )

    const delivered = orders.filter(o => o.status === 'entregado').length
    const returned = orders.filter(o => o.status === 'devuelto').length
    const inTransit = orders.filter(o => o.status === 'en_transito').length
    const pending = orders.filter(o => o.status === 'pendiente').length
    const notConfirmed = orders.filter(o => o.status === 'no_confirmado').length
    const totalOrders = orders.length

    const shopifyDispatched = orders.filter(o => o.channel === 'shopify' && ['entregado','en_transito','devuelto'].includes(o.status)).length
    const whatsDispatched = orders.filter(o => o.channel === 'whatsapp' && ['entregado','en_transito','devuelto'].includes(o.status)).length

    const shopifyConfirmRate = shopifyOrders2 > 0 ? (shopifyDispatched / shopifyOrders2) * 100 : 0
    const shopifyCPA = shopifyOrders2 > 0 ? shopifySpend / shopifyOrders2 : 0
    const shopifyCPAReal = shopifyDispatched > 0 ? shopifySpend / shopifyDispatched : 0
    const whatsCAC = whatsConversations > 0 ? whatsSpend / whatsConversations : 0
    const whatsCPAReal = whatsDispatched > 0 ? whatsSpend / whatsDispatched : 0
    const whatsCloseRate = whatsConversations > 0 ? (whatsDispatched / whatsConversations) * 100 : 0
    const dispatched = delivered + inTransit + returned
    const deliveryRate = dispatched > 0 ? (delivered / dispatched) * 100 : 0

    // Carriers
    const carrierStats: Record<string, { dispatched: number; delivered: number }> = {}
    for (const o of orders) {
      if (!['entregado','en_transito','devuelto'].includes(o.status)) continue
      const c = o.carrier || 'Sin transportadora'
      if (!carrierStats[c]) carrierStats[c] = { dispatched: 0, delivered: 0 }
      carrierStats[c].dispatched++
      if (o.status === 'entregado') carrierStats[c].delivered++
    }

    // Rentabilidad
    const revenue = orders.filter(o => o.status === 'entregado').reduce((s, o) => s + o.price, 0)
    const productCostTotal = orders.filter(o => !['pendiente','no_confirmado'].includes(o.status)).reduce((s, o) => s + o.productCost, 0)
    const shippingDelivered = orders.filter(o => o.status === 'entregado').reduce((s, o) => s + o.shippingCost, 0)
    const shippingReturned = orders.filter(o => o.status === 'devuelto').reduce((s, o) => s + o.shippingCost, 0)
    const fulfillment = dispatched * FULFILLMENT_COST
    const netProfit = revenue - productCostTotal - shippingDelivered - shippingReturned - fulfillment - totalAdSpend
    const roi = totalAdSpend > 0 ? netProfit / totalAdSpend : 0
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

    products.push({
      product,
      shopifyOrders: shopifyOrders2,
      shopifyDispatched,
      shopifyConfirmRate,
      shopifyCPA,
      shopifyCPAReal,
      shopifySpend,
      whatsConversations,
      whatsDispatched,
      whatsCAC,
      whatsCPAReal,
      whatsCloseRate,
      whatsSpend,
      delivered,
      inTransit,
      returned,
      pending,
      notConfirmed,
      totalOrders,
      deliveryRate,
      carrierStats,
      revenue,
      productCost: productCostTotal,
      shippingCostDelivered: shippingDelivered,
      shippingCostReturned: shippingReturned,
      fulfillment,
      totalAdSpend,
      netProfit,
      roi,
      netMargin
    })
  }

  const totalSpend = products.reduce((s, p) => s + p.totalAdSpend, 0)
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0)
  const totalDispatched = products.reduce((s, p) => s + p.shopifyDispatched + p.whatsDispatched, 0)
  const totalDelivered = products.reduce((s, p) => s + p.delivered, 0)
  const totalReturned = products.reduce((s, p) => s + p.returned, 0)
  const totalInTransit = products.reduce((s, p) => s + p.inTransit, 0)
  const totalPending = products.reduce((s, p) => s + p.pending, 0)
  const totalNotConfirmed = products.reduce((s, p) => s + p.notConfirmed, 0)
  const totalOrders = products.reduce((s, p) => s + p.totalOrders, 0)
  const allDispatched = totalDelivered + totalReturned + totalInTransit
  const deliveryRate = allDispatched > 0 ? (totalDelivered / allDispatched) * 100 : 0

  // Global carrier stats
  const globalCarrierStats: Record<string, { dispatched: number; delivered: number }> = {}
  for (const p of products) {
    for (const [carrier, stats] of Object.entries(p.carrierStats)) {
      if (!globalCarrierStats[carrier]) globalCarrierStats[carrier] = { dispatched: 0, delivered: 0 }
      globalCarrierStats[carrier].dispatched += stats.dispatched
      globalCarrierStats[carrier].delivered += stats.delivered
    }
  }

  const netProfitPerProduct = products.reduce((s, p) => s + p.netProfit, 0)
  const adminTotal = adminCosts.payroll + adminCosts.tools
  const netProfitGeneral = netProfitPerProduct - adminTotal
  const accumulatedCapital = totalSpend + netProfitGeneral
  const roiGeneral = totalSpend > 0 ? netProfitGeneral / totalSpend : 0

  const avgRevPerOrder = totalDelivered > 0 ? totalRevenue / totalDelivered : 0
  const inTransitOrders = rocketOrders.filter(o => o.status === 'en_transito')
  const avgProdCost = inTransitOrders.length > 0 ? inTransitOrders.reduce((s, o) => s + o.productCost, 0) / inTransitOrders.length : 0
  const avgShipping = inTransitOrders.length > 0 ? inTransitOrders.reduce((s, o) => s + o.shippingCost, 0) / inTransitOrders.length : 0

  function projectProfit(rate: number): number {
    const del = Math.round(totalInTransit * rate)
    const ret = totalInTransit - del
    return (del * avgRevPerOrder) - (del * avgProdCost) - (del * avgShipping) - (ret * avgShipping) - (totalInTransit * FULFILLMENT_COST)
  }

  return {
    products,
    totalSpend,
    totalRevenue,
    totalDispatched,
    totalDelivered,
    totalReturned,
    totalInTransit,
    totalPending,
    totalNotConfirmed,
    totalOrders,
    deliveryRate,
    carrierStats: globalCarrierStats,
    netProfitPerProduct,
    adminCosts,
    netProfitGeneral,
    accumulatedCapital,
    roiGeneral,
    projections: {
      rate40: projectProfit(0.4),
      rate50: projectProfit(0.5),
      rate60: projectProfit(0.6),
      rate70: projectProfit(0.7)
    }
  }
}
