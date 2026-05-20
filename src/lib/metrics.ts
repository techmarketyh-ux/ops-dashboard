import { AdSpend, RocketOrder, ShopifyProduct, ProductMetrics, GeneralMetrics } from './types'

const FULFILLMENT_COST = 0.85

function colorCPA(val: number): string {
  if (val <= 4) return 'green'
  if (val <= 6.9) return 'yellow'
  return 'red'
}
function colorConfirmRate(val: number): string {
  if (val <= 50) return 'red'
  if (val <= 69) return 'yellow'
  return 'green'
}
function colorCPAReal(val: number): string {
  if (val <= 5) return 'green'
  if (val <= 7.5) return 'yellow'
  return 'red'
}
function colorCostPerConv(val: number): string {
  if (val <= 0.20) return 'green'
  if (val <= 0.39) return 'blue'
  if (val <= 0.60) return 'yellow'
  return 'red'
}
function colorCloseRate(val: number): string {
  if (val < 5) return 'red'
  if (val < 7) return 'yellow'
  if (val <= 10) return 'blue'
  return 'green'
}

export { colorCPA, colorConfirmRate, colorCPAReal, colorCostPerConv, colorCloseRate }

export function computeMetrics(
  adSpends: AdSpend[],
  rocketOrders: RocketOrder[],
  shopifyProducts: ShopifyProduct[],
  adminCosts: { payroll: number; tools: number }
): GeneralMetrics {

  // Recopila todos los productos únicos
  const productSet = new Set<string>()
  adSpends.forEach(a => productSet.add(a.product))
  rocketOrders.forEach(o => productSet.add(o.product))
  shopifyProducts.forEach(s => productSet.add(s.title))

  const products: ProductMetrics[] = []

  for (const product of Array.from(productSet)) {
    if (!product || product === 'sin-mes') continue

    // --- Ad spend ---
    const productAds = adSpends.filter(a => normalizeProduct(a.product) === normalizeProduct(product))
    const shopifySpend = productAds.filter(a => a.channel === 'shopify').reduce((s, a) => s + a.spend, 0)
    const whatsSpend = productAds.filter(a => a.channel === 'whatsapp').reduce((s, a) => s + a.spend, 0)
    const whatsConversations = productAds.filter(a => a.channel === 'whatsapp').reduce((s, a) => s + (a.conversations || 0), 0)
    const totalAdSpend = shopifySpend + whatsSpend

    // --- Shopify report ---
    const shopifyData = shopifyProducts.find(s => normalizeProduct(s.title) === normalizeProduct(product))
    const shopifyOrders = shopifyData?.orders || 0

    // --- Rocket orders for this product ---
    const orders = rocketOrders.filter(o => normalizeProduct(o.product) === normalizeProduct(product))

    const delivered = orders.filter(o => o.status === 'entregado').length
    const returned = orders.filter(o => o.status === 'devuelto').length
    const inTransit = orders.filter(o => o.status === 'en_transito').length
    const pending = orders.filter(o => o.status === 'pendiente').length
    const notConfirmed = orders.filter(o => o.status === 'no_confirmado').length
    const totalOrders = orders.length

    // Despachados = confirmados = entregados + en_tránsito + devueltos (todos los que salieron)
    const dispatched = delivered + inTransit + returned
    const shopifyDispatched = orders.filter(o => o.channel === 'shopify' && (o.status === 'entregado' || o.status === 'en_transito' || o.status === 'devuelto')).length
    const whatsDispatched = orders.filter(o => o.channel === 'whatsapp' && (o.status === 'entregado' || o.status === 'en_transito' || o.status === 'devuelto')).length

    const shopifyConfirmRate = shopifyOrders > 0 ? (shopifyDispatched / shopifyOrders) * 100 : 0
    const shopifyCPA = shopifyOrders > 0 ? shopifySpend / shopifyOrders : 0
    const shopifyCPAReal = shopifyDispatched > 0 ? shopifySpend / shopifyDispatched : 0

    const whatsCAC = whatsConversations > 0 ? whatsSpend / whatsConversations : 0
    const whatsCPAReal = whatsDispatched > 0 ? whatsSpend / whatsDispatched : 0
    const whatsCloseRate = whatsConversations > 0 ? (whatsDispatched / whatsConversations) * 100 : 0

    const deliveryRate = dispatched > 0 ? (delivered / dispatched) * 100 : 0

    // --- Rentabilidad ---
    const revenue = orders.filter(o => o.status === 'entregado').reduce((s, o) => s + o.price, 0)
    const productCostTotal = orders.filter(o => o.status !== 'pendiente' && o.status !== 'no_confirmado').reduce((s, o) => s + o.productCost, 0)
    const shippingDelivered = orders.filter(o => o.status === 'entregado').reduce((s, o) => s + o.shippingCost, 0)
    const shippingReturned = orders.filter(o => o.status === 'devuelto').reduce((s, o) => s + o.shippingCost, 0)
    const fulfillment = dispatched * FULFILLMENT_COST

    const netProfit = revenue - productCostTotal - shippingDelivered - shippingReturned - fulfillment - totalAdSpend
    const roi = totalAdSpend > 0 ? netProfit / totalAdSpend : 0
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

    products.push({
      product,
      shopifyOrders,
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

  // --- Totales generales ---
  const totalSpend = products.reduce((s, p) => s + p.totalAdSpend, 0)
  const totalRevenue = products.reduce((s, p) => s + p.revenue, 0)
  const totalDispatched = products.reduce((s, p) => s + p.shopifyDispatched + p.whatsDispatched, 0)
  const totalDelivered = products.reduce((s, p) => s + p.delivered, 0)
  const totalReturned = products.reduce((s, p) => s + p.returned, 0)
  const totalInTransit = products.reduce((s, p) => s + p.inTransit, 0)
  const totalPending = products.reduce((s, p) => s + p.pending, 0)
  const totalNotConfirmed = products.reduce((s, p) => s + p.notConfirmed, 0)
  const totalOrders = products.reduce((s, p) => s + p.totalOrders, 0)
  const deliveryRate = (totalDispatched) > 0 ? (totalDelivered / (totalDelivered + totalReturned + totalInTransit)) * 100 : 0

  const netProfitPerProduct = products.reduce((s, p) => s + p.netProfit, 0)
  const adminTotal = adminCosts.payroll + adminCosts.tools
  const netProfitGeneral = netProfitPerProduct - adminTotal
  const accumulatedCapital = totalSpend + netProfitGeneral
  const roiGeneral = totalSpend > 0 ? netProfitGeneral / totalSpend : 0

  // Proyecciones — sobre pedidos en tránsito
  const avgRevenuePerOrder = totalOrders > 0 ? totalRevenue / Math.max(totalDelivered, 1) : 0
  const avgProductCost = rocketOrders.length > 0
    ? rocketOrders.filter(o => o.status === 'en_transito').reduce((s, o) => s + o.productCost, 0) / Math.max(totalInTransit, 1)
    : 0
  const avgShipping = rocketOrders.length > 0
    ? rocketOrders.filter(o => o.status === 'en_transito').reduce((s, o) => s + o.shippingCost, 0) / Math.max(totalInTransit, 1)
    : 0

  function projectProfit(rate: number): number {
    const delivered = Math.round(totalInTransit * rate)
    const returned = totalInTransit - delivered
    const rev = delivered * avgRevenuePerOrder
    const costs = (delivered * avgProductCost) + (delivered * avgShipping) + (returned * avgShipping) + (totalInTransit * FULFILLMENT_COST)
    return rev - costs
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

// Normaliza nombres para comparar: minúsculas, sin acentos, sin espacios extra
export function normalizeProduct(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
