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
  loaded: boolean
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading'; promise: Promise<RebrickableCatalog> }
  | { status: 'ready'; catalog: RebrickableCatalog }
  | { status: 'error'; error: Error }

let state: LoadState = { status: 'idle' }

function emptyCatalog(): RebrickableCatalog {
  return {
    elements: new Map(),
    partNames: new Map(),
    rbToBlColor: new Map(
      Object.entries(rbToBlColors).map(([k, v]) => [Number(k), Number(v)]),
    ),
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

function parseElements(text: string): Map<ElementId, CatalogElement> {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  })
  const map = new Map<ElementId, CatalogElement>()
  for (const row of parsed.data) {
    const elementId = String(row.element_id ?? '').trim()
    const partNum = String(row.part_num ?? '').trim()
    const colorRaw = String(row.color_id ?? '').trim()
    if (!elementId || !partNum || colorRaw === '') continue
    const colorId = Number(colorRaw)
    if (!Number.isFinite(colorId)) continue
    map.set(elementId, { partNum, colorId })
  }
  return map
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

  return {
    elements: parseElements(elementsText),
    partNames: parsePartNames(partsText),
    rbToBlColor: new Map(
      Object.entries(rbToBlColors).map(([k, v]) => [Number(k), Number(v)]),
    ),
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
