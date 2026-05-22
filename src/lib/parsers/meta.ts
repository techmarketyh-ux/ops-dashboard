import * as XLSX from 'xlsx'
import { AdSpend } from '../types'

function isWhatsApp(name: string): boolean {
  return name.toUpperCase().includes('WHATS')
}

export function extractProductFromMeta(campaignName: string): string {
  let name = campaignName
    .replace(/^(CBO SMART|CBO WHATS?APP?|CBO WHATS|CBO)\s*[-–]\s*/i, '')
    .replace(/^(ABO)\s*[-–]\s*/i, '')
    .replace(/^Copy \d+ of /i, '')
    .trim()
  const parts = name.split(/\s*[-–]\s*/)
  if (parts.length >= 2) return parts[0].trim()
  return name.trim()
}

export function parseMetaReport(buffer: ArrayBuffer): AdSpend[] {
  const wb = XLSX.read(buffer, { type: 'array', raw: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as string[][]

  // Find header row
  let headerIdx = -1
  for (let i = 0; i < allRows.length; i++) {
    if (allRows[i].some(cell => String(cell).includes('Nombre de la campaña'))) {
      headerIdx = i; break
    }
  }
  if (headerIdx === -1) return []

  const headers = allRows[headerIdx].map(h => String(h).trim())
  const colCampaign = headers.findIndex(h => h.includes('Nombre de la campaña'))
  const colSpend = headers.findIndex(h => h.includes('Importe gastado'))
  const colResults = headers.findIndex(h => h === 'Resultados')
  const colDay = headers.findIndex(h => h === 'Día')
  const colMonth = headers.findIndex(h => h === 'Mes')
  const colDateStart = headers.findIndex(h => h.includes('Inicio del informe'))
  const isDailyReport = colDay >= 0

  const results: AdSpend[] = []
  let currentCampaign = ''
  let currentDate = ''

  for (let i = headerIdx + 1; i < allRows.length; i++) {
    const row = allRows[i]
    if (!row || row.every(c => !c)) continue

    const campaignName = String(row[colCampaign] || '').trim()
    const dia = colDay >= 0 ? String(row[colDay] || '').trim() : ''
    const spend = parseFloat(String(row[colSpend] || '0')) || 0
    const resultados = parseFloat(String(row[colResults] || '0')) || 0

    if (isDailyReport) {
      if (campaignName) currentCampaign = campaignName
      // For daily report: process each day row individually (not just "All")
      // Skip the "All" summary row to avoid double counting
      if (dia === 'All' || dia === 'all') continue
      if (!dia || !currentCampaign) continue
      currentDate = dia.slice(0, 10)
    } else {
      if (!campaignName) continue
      currentCampaign = campaignName
      currentDate = String(row[colMonth] || row[colDateStart] || '').slice(0, 7)
    }

    if (spend === 0) continue

    const whatsapp = isWhatsApp(currentCampaign)
    const product = extractProductFromMeta(currentCampaign)

    // For WhatsApp daily: resultados per day
    results.push({
      product,
      channel: whatsapp ? 'whatsapp' : 'shopify',
      spend,
      conversations: whatsapp ? resultados : undefined,
      month: currentDate || 'sin-fecha'
    })
  }

  return results
}
