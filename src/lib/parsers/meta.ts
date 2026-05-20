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

  // Convert to array of arrays to handle multi-header reports
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as string[][]

  // Find the header row — look for row containing "Nombre de la campaña"
  let headerIdx = -1
  for (let i = 0; i < allRows.length; i++) {
    if (allRows[i].some(cell => String(cell).includes('Nombre de la campaña'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const headers = allRows[headerIdx].map(h => String(h).trim())

  // Find column indices
  const colCampaign = headers.findIndex(h => h.includes('Nombre de la campaña'))
  const colSpend = headers.findIndex(h => h.includes('Importe gastado'))
  const colResults = headers.findIndex(h => h === 'Resultados')
  const colResultType = headers.findIndex(h => h.includes('Tipo de resultado'))
  const colDay = headers.findIndex(h => h === 'Día')
  const colMonth = headers.findIndex(h => h === 'Mes')
  const colDateStart = headers.findIndex(h => h.includes('Inicio del informe'))

  const isDailyReport = colDay >= 0

  const results: AdSpend[] = []
  let currentCampaign = ''

  for (let i = headerIdx + 1; i < allRows.length; i++) {
    const row = allRows[i]
    if (!row || row.every(c => !c)) continue

    const campaignName = String(row[colCampaign] || '').trim()
    const dia = colDay >= 0 ? String(row[colDay] || '').trim() : ''
    const spend = parseFloat(String(row[colSpend] || '0')) || 0
    const resultados = parseFloat(String(row[colResults] || '0')) || 0
    const month = colMonth >= 0
      ? String(row[colMonth] || '').slice(0, 7)
      : String(row[colDateStart] || '').slice(0, 7)

    if (isDailyReport) {
      // Update current campaign when name appears
      if (campaignName) currentCampaign = campaignName
      // Only process the "All" total row per campaign
      if (dia !== 'All') continue
      if (!currentCampaign) continue
    } else {
      if (!campaignName) continue
      currentCampaign = campaignName
    }

    if (spend === 0) continue

    const whatsapp = isWhatsApp(currentCampaign)
    const product = extractProductFromMeta(currentCampaign)

    results.push({
      product,
      channel: whatsapp ? 'whatsapp' : 'shopify',
      spend,
      conversations: whatsapp ? resultados : undefined,
      month: month || 'sin-mes'
    })
  }

  return results
}
