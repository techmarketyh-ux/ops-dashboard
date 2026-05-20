import * as XLSX from 'xlsx'
import { AdSpend } from '../types'

// Detecta si la campaña es de WhatsApp
function isWhatsApp(campaignName: string): boolean {
  const upper = campaignName.toUpperCase()
  return upper.includes('WHATS') || upper.includes('WHATSAPP')
}

// Extrae nombre de producto del nombre de campaña Meta
// Formato: CBO - NOMBRE PRODUCTO - TIENDA WEB - ... 
// Formato WA: CBO - NOMBRE PRODUCTO - TIENDA WHATS 1 - ...
export function extractProductFromMeta(campaignName: string): string {
  // Limpia prefijos comunes
  let name = campaignName
    .replace(/^(CBO SMART|CBO WHATS?APP?|CBO WHATS|CBO)\s*[-–]\s*/i, '')
    .replace(/^(ABO)\s*[-–]\s*/i, '')
    .replace(/^Copy \d+ of /i, '')
    .trim()

  // Quita sufijo tienda (todo lo que viene después del segundo " - ")
  const parts = name.split(/\s*[-–]\s*/)
  if (parts.length >= 2) {
    // El producto es la primera parte tras quitar el prefijo
    return parts[0].trim()
  }
  return name.trim()
}

export function parseMetaReport(buffer: ArrayBuffer): AdSpend[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

  const results: AdSpend[] = []

  for (const row of rows) {
    const campaignName = String(row['Nombre de la campaña'] || '').trim()
    if (!campaignName) continue

    const spend = parseFloat(String(row['Importe gastado (USD)'] || 0)) || 0
    if (spend === 0) continue

    const month = String(row['Mes'] || row['Inicio del informe'] || '').slice(0, 7)
    const whatsapp = isWhatsApp(campaignName)
    const product = extractProductFromMeta(campaignName)

    // Conversaciones solo para WhatsApp
    let conversations: number | undefined
    if (whatsapp) {
      const resultados = parseFloat(String(row['Resultados'] || 0)) || 0
      conversations = resultados
    }

    results.push({
      product,
      channel: whatsapp ? 'whatsapp' : 'shopify',
      spend,
      conversations,
      month: month || 'sin-mes'
    })
  }

  return results
}
