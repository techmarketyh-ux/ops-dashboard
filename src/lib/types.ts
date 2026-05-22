export interface ProductMapping {
  campaignName: string
  rocketName: string
}

export interface AdSpend {
  product: string
  channel: 'shopify' | 'whatsapp'
  spend: number
  conversations?: number
  month: string
}

export interface RocketOrder {
  id: string
  product: string
  rocketProduct: string
  status: RocketStatus
  clientName: string
  phone: string
  shopifyId: string
  isManual: boolean
  channel: 'shopify' | 'whatsapp'
  price: number
  productCost: number
  shippingCost: number
  totalCost: number
  orderDate: string
  confirmDate: string
  carrier: string
}

export type RocketStatus =
  | 'entregado'
  | 'devuelto'
  | 'en_transito'
  | 'pendiente'
  | 'no_confirmado'

export interface ShopifyOrder {
  shopifyId: string
  orderName: string
  product: string
  clientName: string
  phone: string
  createdAt: string
  total: number
  qty: number
}

export interface ShopifyProduct {
  title: string
  orders: number
  netSales: number
  grossSales: number
  itemsSold: number
}

export interface CarrierStats {
  [carrier: string]: { dispatched: number; delivered: number }
}

export interface ProductMetrics {
  product: string
  shopifyOrders: number
  shopifyDispatched: number
  shopifyConfirmRate: number
  shopifyCPA: number
  shopifyCPAReal: number
  shopifySpend: number
  whatsConversations: number
  whatsDispatched: number
  whatsCAC: number
  whatsCPAReal: number
  whatsCloseRate: number
  whatsSpend: number
  delivered: number
  inTransit: number
  returned: number
  pending: number
  notConfirmed: number
  totalOrders: number
  deliveryRate: number
  carrierStats: CarrierStats
  revenue: number
  productCost: number
  shippingCostDelivered: number
  shippingCostReturned: number
  fulfillment: number
  totalAdSpend: number
  netProfit: number
  roi: number
  netMargin: number
}

export interface GeneralMetrics {
  products: ProductMetrics[]
  totalSpend: number
  totalRevenue: number
  totalDispatched: number
  totalDelivered: number
  totalReturned: number
  totalInTransit: number
  totalPending: number
  totalNotConfirmed: number
  totalOrders: number
  deliveryRate: number
  carrierStats: CarrierStats
  netProfitPerProduct: number
  adminCosts: { payroll: number; tools: number }
  netProfitGeneral: number
  accumulatedCapital: number
  roiGeneral: number
  projections: {
    rate40: number
    rate50: number
    rate60: number
    rate70: number
  }
}

// Raw data returned to frontend for client-side filtering
export interface RawData {
  adSpends: AdSpend[]
  rocketOrders: RocketOrder[]
  shopifyOrders: ShopifyOrder[]
}

export interface Filters {
  product: string
  channel: string
  carrier: string
  dateFrom: string
  dateTo: string
}
