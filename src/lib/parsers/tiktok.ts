import * as XLSX from 'xlsx'
import { AdSpend } from '../types'

// Extrae nombre de producto del nombre de campaña TikTok
// Formato: ABO/CBO - NOMBRE PRODUCTO - NOMBRE TIENDA
export function extractProductFromTikTok(campaignName: string): string {
  const parts = campaignName.split(' - ')
  if (parts.length >= 2) {
    // quita prefijo ABO/CBO y sufijo tienda
    return parts.slice(1, parts.length - 1).join(' - ').trim()
  }
  return campaignName.trim()
}

// TikTok es siempre Shopify (web), nunca WhatsApp
export function parseTikTokReport(buffer: ArrayBuffer): AdSpend[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const results: AdSpend[] = []

  for (const row of rows) {
    const campaignName = String(row['Campaign name'] || '').trim()
    if (!campaignName || campaignName.toLowerCase().startsWith('total')) continue

    const spend = parseFloat(String(row['Cost'] || 0)) || 0
    if (spend === 0) continue

    const month = String(row['By month'] || '').slice(0, 7) // YYYY-MM

    const product = extractProductFromTikTok(campaignName)

    results.push({
      product,
      channel: 'shopify',
      spend,
      month: month || 'sin-mes'
    })
  }

  return results
}
