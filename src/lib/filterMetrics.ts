import { AdSpend, RocketOrder, ShopifyOrder, Filters, GeneralMetrics } from './types'
import { computeMetrics } from './metrics'

function dateInRange(date: string, from: string, to: string): boolean {
  if (!date) return true
  const d = date.slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

export function filterAndRecompute(
  adSpends: AdSpend[],
  rocketOrders: RocketOrder[],
  shopifyOrders: ShopifyOrder[],
  filters: Filters,
  adminCosts: { payroll: number; tools: number }
): GeneralMetrics {
  // Filter adSpends by date, product, channel
  let filteredAds = adSpends
  if (filters.dateFrom || filters.dateTo) {
    filteredAds = filteredAds.filter(a => dateInRange(a.month, filters.dateFrom, filters.dateTo))
  }
  if (filters.product) {
    filteredAds = filteredAds.filter(a => a.product === filters.product)
  }
  if (filters.channel) {
    filteredAds = filteredAds.filter(a => a.channel === filters.channel)
  }

  // Filter rocket orders by date, product, channel, carrier
  let filteredRocket = rocketOrders
  if (filters.dateFrom || filters.dateTo) {
    filteredRocket = filteredRocket.filter(o => dateInRange(o.orderDate, filters.dateFrom, filters.dateTo))
  }
  if (filters.product) {
    filteredRocket = filteredRocket.filter(o => o.product === filters.product)
  }
  if (filters.channel) {
    filteredRocket = filteredRocket.filter(o => o.channel === filters.channel)
  }
  if (filters.carrier) {
    filteredRocket = filteredRocket.filter(o => o.carrier === filters.carrier)
  }

  // Filter shopify orders by date, product
  let filteredShopify = shopifyOrders
  if (filters.dateFrom || filters.dateTo) {
    filteredShopify = filteredShopify.filter(o => dateInRange(o.createdAt, filters.dateFrom, filters.dateTo))
  }
  if (filters.product) {
    filteredShopify = filteredShopify.filter(o => o.product === filters.product)
  }

  return computeMetrics(filteredAds, filteredRocket, filteredShopify, adminCosts)
}
