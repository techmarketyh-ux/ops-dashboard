import Papa from 'papaparse'
import { ShopifyProduct } from '../types'

export function parseShopifyReport(text: string): ShopifyProduct[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true
  })

  return result.data.map(row => ({
    title: String(row['Product title'] || '').trim(),
    orders: parseInt(String(row['Orders'] || '0')) || 0,
    netSales: parseFloat(String(row['Net sales'] || '0')) || 0,
    grossSales: parseFloat(String(row['Gross sales'] || '0')) || 0,
    itemsSold: parseInt(String(row['Net items sold'] || '0')) || 0
  })).filter(p => p.title)
}
