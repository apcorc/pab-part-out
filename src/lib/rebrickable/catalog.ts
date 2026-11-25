import Papa from 'papaparse'
import type { BrickLinkMapping, DiffRow, ElementId } from '@/domain/types'
import rbToBlColors from './rbToBlColors.json' with { type: 'json' }

export interface CatalogElement {
  partNum: string
  colorId: number
}

export interface RebrickableCatalog {
  elements: Map<ElementId, CatalogElement>
  partNames: Map<string, string>
  rbToBlColor: Map<number, number>
  /** BrickLink color ID → Rebrickable color IDs that map to it. */
  blToRbColor: Map<number, number[]>
  /** Keyed by part number and Rebrickable color ID. */
  elementsByPartAndColor: Map<string, ElementId[]>
  loaded: boolean
}

export interface BrickLinkElementMatch {
  elementId: ElementId
  alternatives: ElementId[]
  /** More than one Rebrickable color for this part maps to the BrickLink color. */
  colorAmbiguous: boolean
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<RebrickableCatalog> }
  | { status: 'ready'; catalog: RebrickableCatalog }
  | { status: 'error'; error: Error }

let state: LoadState = { status: 'idle' }

function colorMaps(): {
  rbToBlColor: Map<number, number>
  blToRbColor: Map<number, number[]>
} {
  const rbToBlColor = new Map(
    Object.entries(rbToBlColors).map(([k, v]) => [Number(k), Number(v)]),
  )
  const blToRbColor = new Map<number, number[]>()
  for (const [rb, bl] of rbToBlColor) {
    const list = blToRbColor.get(bl)
    if (list) list.push(rb)
    else blToRbColor.set(bl, [rb])
  }
  return { rbToBlColor, blToRbColor }
}

function partColorKey(partNum: string, colorId: number): string {
  return `${partNum}\0${colorId}`
}

function emptyCatalog(): RebrickableCatalog {
  const { rbToBlColor, blToRbColor } = colorMaps()
  return {
    elements: new Map(),
    partNames: new Map(),
    rbToBlColor,
    blToRbColor,
    elementsByPartAndColor: new Map(),
    loaded: false,
  }
}

async function fetchCsv(path: string): Promise<string> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`Failed to load ${path} (${res.status})`)
  }
  return res.text()
}

function parseElements(text: string): {
  elements: Map<ElementId, CatalogElement>
  elementsByPartAndColor: Map<string, ElementId[]>
} {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  })
  const elements = new Map<ElementId, CatalogElement>()
  const elementsByPartAndColor = new Map<string, ElementId[]>()
  for (const row of parsed.data) {
    const elementId = String(row.element_id ?? '').trim()
    const partNum = String(row.part_num ?? '').trim()
    const colorRaw = String(row.color_id ?? '').trim()
    if (!elementId || !partNum || colorRaw === '') continue
    if (elements.has(elementId)) continue
    const colorId = Number(colorRaw)
    if (!Number.isFinite(colorId)) continue
    elements.set(elementId, { partNum, colorId })
    const key = partColorKey(partNum, colorId)
    const list = elementsByPartAndColor.get(key)
    if (list) list.push(elementId)
    else elementsByPartAndColor.set(key, [elementId])
  }
  return { elements, elementsByPartAndColor }
}

function parsePartNames(text: string): Map<string, string> {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  })
  const map = new Map<string, string>()
  for (const row of parsed.data) {
    const partNum = String(row.part_num ?? '').trim()
    const name = String(row.name ?? '').trim()
    if (!partNum || !name) continue
    map.set(partNum, name)
  }
  return map
}

async function buildCatalog(): Promise<RebrickableCatalog> {
  const base = import.meta.env.BASE_URL
  const [elementsText, partsText] = await Promise.all([
    fetchCsv(`${base}rebrickable-db/elements.csv`),
    fetchCsv(`${base}rebrickable-db/parts.csv`),
  ])

  const { elements, elementsByPartAndColor } = parseElements(elementsText)
  const { rbToBlColor, blToRbColor } = colorMaps()
  return {
    elements,
    partNames: parsePartNames(partsText),
    rbToBlColor,
    blToRbColor,
    elementsByPartAndColor,
    loaded: true,
  }
}

/** Load Rebrickable CSVs once; subsequent calls share the same promise/result. */
export function loadRebrickableCatalog(): Promise<RebrickableCatalog> {
  if (state.status === 'ready') return Promise.resolve(state.catalog)
  if (state.status === 'loading') return state.promise
  if (state.status === 'error') return Promise.reject(state.error)

  const promise = buildCatalog()
    .then((catalog) => {
      state = { status: 'ready', catalog }
      return catalog
    })
    .catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error))
      state = { status: 'error', error: err }
      throw err
    })

  state = { status: 'loading', promise }
  return promise
}

export function getCachedCatalog(): RebrickableCatalog | null {
  return state.status === 'ready' ? state.catalog : null
}

export function lookupPartName(
  catalog: RebrickableCatalog,
  elementId: ElementId,
): string | undefined {
  const el = catalog.elements.get(elementId)
  if (!el) return undefined
  return catalog.partNames.get(el.partNum)
}

export function enrichDiffRows(
  rows: DiffRow[],
  catalog: RebrickableCatalog | null,
): DiffRow[] {
  if (!catalog?.loaded) return rows
  return rows.map((row) => {
    if (row.name) return row
    const name = lookupPartName(catalog, row.elementId)
    return name ? { ...row, name } : row
  })
}

/**
 * LEGO's original element IDs are the design number plus a two-digit color
 * code (300121 = 3001 + 21). Letter-suffix parts such as 3069b used the
 * numeric stem (306925).
 */
function classicRank(elementId: string, partNum: string): number {
  if (
    elementId.startsWith(partNum) &&
    /^\d{2}$/.test(elementId.slice(partNum.length))
  ) {
    return 2
  }
  const stem = partNum.replace(/[a-z]+$/i, '')
  if (
    stem !== partNum &&
    stem.length >= 3 &&
    /^\d+$/.test(stem) &&
    elementId.startsWith(stem) &&
    /^\d{2}$/.test(elementId.slice(stem.length))
  ) {
    return 1
  }
  return 0
}

function compareElementIdsDesc(a: string, b: string): number {
  const na = Number(a)
  const nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return nb - na
  return b.localeCompare(a)
}

function preferElementId(
  ids: ElementId[],
  catalog: RebrickableCatalog,
  itemId: string,
): ElementId {
  let best = ids[0]
  let bestRank = -1
  for (const id of ids) {
    const partNum = catalog.elements.get(id)?.partNum ?? itemId
    const rank = classicRank(id, partNum)
    if (
      rank > bestRank ||
      (rank === bestRank && compareElementIdsDesc(id, best) < 0)
    ) {
      best = id
      bestRank = rank
    }
  }
  return best
}

/** Resolve a BrickLink part and color ID to a LEGO element ID. */
export function lookupElementForBrickLink(
  catalog: RebrickableCatalog,
  itemId: string,
  blColorId: number,
): BrickLinkElementMatch | null {
  const item = itemId.trim()
  if (!item) return null
  const rbColors = catalog.blToRbColor.get(blColorId)
  if (!rbColors || rbColors.length === 0) return null

  const ids: ElementId[] = []
  const seen = new Set<ElementId>()
  let colorsHit = 0
  for (const rbColor of rbColors) {
    const found = catalog.elementsByPartAndColor.get(partColorKey(item, rbColor))
    if (!found || found.length === 0) continue
    colorsHit += 1
    for (const id of found) {
      if (seen.has(id)) continue
      seen.add(id)
      ids.push(id)
    }
  }
  if (ids.length === 0) return null

  const elementId = preferElementId(ids, catalog, item)
  return {
    elementId,
    alternatives: ids.filter((id) => id !== elementId),
    colorAmbiguous: colorsHit > 1,
  }
}

export function lookupBrickLinkMapping(
  catalog: RebrickableCatalog,
  elementId: ElementId,
): BrickLinkMapping | null {
  const el = catalog.elements.get(elementId)
  if (!el) return null
  const blColor = catalog.rbToBlColor.get(el.colorId)
  if (blColor === undefined) return null
  return {
    elementId,
    itemId: el.partNum,
    colorId: blColor,
    itemType: 'PART',
  }
}

export function mappingsForRemaining(
  rows: DiffRow[],
  catalog: RebrickableCatalog,
): { mappings: BrickLinkMapping[]; missing: string[] } {
  const mappings: BrickLinkMapping[] = []
  const missing: string[] = []
  for (const row of rows) {
    if (row.orphan || row.excluded || row.remaining <= 0) continue
    const mapping = lookupBrickLinkMapping(catalog, row.elementId)
    if (!mapping) {
      missing.push(row.elementId)
      continue
    }
    mappings.push(mapping)
  }
  return { mappings, missing }
}

export function createEmptyCatalog(): RebrickableCatalog {
  return emptyCatalog()
}
