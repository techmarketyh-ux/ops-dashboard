import Papa from 'papaparse'

export interface ProductMap {
  campaign: string   // nombre canónico (de campañas)
  rocket: string     // nombre en Rocket
  shopify: string    // nombre en Shopify (sin variante)
}

// Parsea el CSV de mapeo:
// campaña,rocket,shopify
// BRASIER OEAK,BRASIER OEAK,OEAK Brasier
export function parseMappingsCSV(text: string): ProductMap[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true
  })
  return result.data
    .filter(row => row.campaña || row.campaign || row['campaña'])
    .map(row => ({
      campaign: (row['campaña'] || row['campaign'] || '').trim(),
      rocket: (row['rocket'] || '').trim(),
      shopify: (row['shopify'] || '').trim()
    }))
    .filter(m => m.campaign)
}

// Builds lookup: rocket name → canonical campaign name
export function buildRocketMap(maps: ProductMap[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const m of maps) {
    if (m.rocket) result[m.rocket] = m.campaign
  }
  return result
}

// Builds lookup: shopify product name → canonical campaign name
export function buildShopifyMap(maps: ProductMap[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const m of maps) {
    if (m.shopify) result[m.shopify] = m.campaign
  }
  return result
}
