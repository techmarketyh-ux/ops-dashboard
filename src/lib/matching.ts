// Normaliza un nombre para comparación
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Palabras que no sirven para identificar un producto
const STOP_WORDS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'y', 'en', 'con',
  'para', 'por', 'a', 'al', 'su', 'sus', 'cbo', 'abo', 'whats', 'whatsapp',
  'web', 'yh', 'ecuador', 'ec', 'techmarket', 'techmarketyh', 'tienda',
  'copy', 'carp', 'copia', 'of', 'smart', '1', '2', '3', '4', '5'
])

// Extrae palabras clave significativas de un nombre
export function getKeywords(name: string): Set<string> {
  const words = normalizeName(name).split(' ')
  return new Set(words.filter(w => w.length > 2 && !STOP_WORDS.has(w)))
}

// Calcula score de coincidencia entre dos nombres (0 a 1)
export function matchScore(nameA: string, nameB: string): number {
  const kwA = getKeywords(nameA)
  const kwB = getKeywords(nameB)
  if (kwA.size === 0 || kwB.size === 0) return 0

  let matches = 0
  for (const w of Array.from(kwA)) {
    if (kwB.has(w)) matches++
  }

  // Jaccard similarity
  const union = new Set([...Array.from(kwA), ...Array.from(kwB)]).size
  return matches / union
}

// Umbral mínimo para considerar dos nombres como el mismo producto
const MATCH_THRESHOLD = 0.4

// Dado un nombre, encuentra el mejor match en una lista de nombres canónicos
export function findBestMatch(name: string, candidates: string[]): string | null {
  let bestScore = 0
  let bestMatch: string | null = null

  for (const candidate of candidates) {
    const score = matchScore(name, candidate)
    if (score > bestScore && score >= MATCH_THRESHOLD) {
      bestScore = score
      bestMatch = candidate
    }
  }

  return bestMatch
}

// Construye un mapa de nombres de Rocket → nombre canónico de campaña
// y nombres de Shopify → nombre canónico de campaña
export function buildAutoMappings(
  campaignNames: string[],
  rocketNames: string[],
  shopifyNames: string[]
): {
  rocketToCanonical: Record<string, string>
  shopifyToCanonical: Record<string, string>
} {
  // Los nombres de campaña son el "canónico"
  const canonical = Array.from(new Set(campaignNames))

  const rocketToCanonical: Record<string, string> = {}
  for (const rocketName of rocketNames) {
    const match = findBestMatch(rocketName, canonical)
    if (match) rocketToCanonical[rocketName] = match
    else rocketToCanonical[rocketName] = rocketName // sin match, usa su propio nombre
  }

  const shopifyToCanonical: Record<string, string> = {}
  for (const shopifyName of shopifyNames) {
    const match = findBestMatch(shopifyName, canonical)
    if (match) shopifyToCanonical[shopifyName] = match
    else shopifyToCanonical[shopifyName] = shopifyName
  }

  return { rocketToCanonical, shopifyToCanonical }
}
