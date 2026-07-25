/** LEGO Element ID as string (preserve leading zeros if any) */
export type ElementId = string

export interface SetPart {
  elementId: ElementId
  requiredQty: number
  name?: string
  imageUrl?: string
}

export interface OrderLine {
  elementId: ElementId
  quantity: number
  name?: string
  imageUrl?: string
}

export interface Order {
  id: string
  label: string
  importedAt: string
  source: 'pab-csv' | 'manual'
  lines: OrderLine[]
}

export type ExportFormat = 'lego-csv' | 'bricklink-xml'

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  parts: SetPart[]
  orders: Order[]
}

export interface ProjectStats {
  uniqueElements: number
  totalRequired: number
  totalOrdered: number
  totalRemaining: number
  percentComplete: number
}

export interface DiffRow {
  elementId: ElementId
  name?: string
  imageUrl?: string
  required: number
  ordered: number
  remaining: number
  surplus: number
  orphan: boolean
}

export type ThemeMode = 'light' | 'dark' | 'system'

export type PartsFilter = 'all' | 'remaining' | 'complete' | 'surplus' | 'orphans'

export interface AppPersistedState {
  version: 1
  projects: Project[]
  activeProjectId: string | null
  theme: ThemeMode
}

export interface ParseRowError {
  row: number
  message: string
}

export interface ParseResult<T> {
  data: T
  errors: ParseRowError[]
  warnings: string[]
}

/** Optional BrickLink mapping for a LEGO Element ID */
export interface BrickLinkMapping {
  elementId: ElementId
  itemId: string
  colorId: number
  itemType?: 'PART' | 'MINIFIG' | 'SET' | 'BOOK' | 'GEAR' | 'CATALOG' | 'INSTRUCTION' | 'UNSORTED_LOT' | 'ORIGINAL_BOX'
}
