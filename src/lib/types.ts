// ── Tipos centrales del dashboard ──────────────────────────────────────────

export interface ProductMapping {
  campaignName: string   // nombre extraído de la campaña
  rocketName: string     // nombre en Rocket
}

export interface AdSpend {
  product: string
  channel: 'shopify' | 'whatsapp'
  spend: number
  conversations?: number  // solo WhatsApp
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
}

export type RocketStatus =
  | 'entregado'
  | 'devuelto'
  | 'en_transito'
  | 'pendiente'
  | 'no_confirmado'

export interface ShopifyProduct {
  title: string
  orders: number
  netSales: number
  grossSales: number
  itemsSold: number
}

export interface ProductMetrics {
  product: string
  // Shopify
  shopifyOrders: number
  shopifyDispatched: number
  shopifyConfirmRate: number
  shopifyCPA: number
  shopifyCPAReal: number
  shopifySpend: number
  // WhatsApp
  whatsConversations: number
  whatsDispatched: number
  whatsCAC: number       // costo por conversación
  whatsCPAReal: number
  whatsCloseRate: number
  whatsSpend: number
  // Logística
  delivered: number
  inTransit: number
  returned: number
  pending: number
  notConfirmed: number
  totalOrders: number
  deliveryRate: number
  // Rentabilidad
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
  netProfitPerProduct: number  // suma profits sin gastos admin
  adminCosts: {
    payroll: number
    tools: number
  }
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
