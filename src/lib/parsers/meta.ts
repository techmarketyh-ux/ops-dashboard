import * as XLSX from 'xlsx'
import { AdSpend } from '../types'

function isWhatsApp(campaignName: string): boolean {
  const upper = campaignName.toUpperCase()
  return upper.includes('WHATS') || upper.includes('WHATSAPP')
}

export function extractProductFromMeta(campaignName: string): string {
  let name = campaignName
    .replace(/^(CBO SMART|CBO WHATS?APP?|CBO WHATS|CBO)\s*[-–]\s*/i, '')
    .replace(/^(ABO)\s*[-–]\s*/i, '')
    .replace(/^Copy \d+ of /i, '')
    .trim()

  const parts = name.split(/\s*[-–]\s*/)
  if (parts.length >= 2) {
    return parts[0].trim()
  }
  return name.trim()
}

export function parseMetaReport(buffer: ArrayBuffer): AdSpend[] {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false })

  const results: AdSpend[] = []

  // Detecta si es reporte por día (tiene columna "Día") o por mes (tiene columna "Mes")
  const sampleKeys = rows.length > 0 ? Object.keys(rows[0]) : []
  const isDailyReport = sampleKeys.some(k => k.trim() === 'Día')

  if (isDailyReport) {
    // Reporte por día: estructura agrupada donde las filas con nombre de campaña
    // y "All" en la columna Día son los totales — usamos solo esas
    let currentCampaign = ''
    for (const row of rows) {
      const campaignName = String(row['Nombre de la campaña'] || '').trim()
      const dia = String(row['Día'] || '').trim()

      // Si tiene nombre de campaña, lo guardamos como campaña activa
      if (campaignName) currentCampaign = campaignName

      // Solo procesamos la fila de total (All) de cada campaña
      if (dia !== 'All' && dia !== 'all') continue
      if (!currentCampaign) continue

      const spend = parseFloat(String(row['Importe gastado (USD)'] || 0)) || 0
      if (spend === 0) continue

      const whatsapp = isWhatsApp(currentCampaign)
      const product = extractProductFromMeta(currentCampaign)
      const month = String(row['Inicio del informe'] || '').slice(0, 7)

      let conversations: number | undefined
      if (whatsapp) {
        conversations = parseFloat(String(row['Resultados'] || 0)) || 0
      }

      results.push({
        product,
        channel: whatsapp ? 'whatsapp' : 'shopify',
        spend,
        conversations,
        month: month || 'sin-mes'
      })
    }
  } else {
    // Reporte por mes: estructura plana original
    for (const row of rows) {
      const campaignName = String(row['Nombre de la campaña'] || '').trim()
      if (!campaignName) continue

      const spend = parseFloat(String(row['Importe gastado (USD)'] || 0)) || 0
      if (spend === 0) continue

      const month = String(row['Mes'] || row['Inicio del informe'] || '').slice(0, 7)
      const whatsapp = isWhatsApp(campaignName)
      const product = extractProductFromMeta(campaignName)

      let conversations: number | undefined
      if (whatsapp) {
        conversations = parseFloat(String(row['Resultados'] || 0)) || 0
      }

      results.push({
        product,
        channel: whatsapp ? 'whatsapp' : 'shopify',
        spend,
        conversations,
        month: month || 'sin-mes'
      })
    }
  }

  return results
}
