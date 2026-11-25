import type {
  AppPersistedState,
  ElementId,
  PartList,
  Project,
  SetPart,
  ThemeMode,
} from '@/domain/types'

type UnknownRecord = Record<string, unknown>

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeSetPart(raw: unknown): SetPart | null {
  if (!isObject(raw)) return null
  if (typeof raw.elementId !== 'string' || raw.elementId.trim() === '') return null
  const requiredQty =
    typeof raw.requiredQty === 'number' ? raw.requiredQty : Number(raw.requiredQty)
  if (!Number.isFinite(requiredQty)) return null
  const part: SetPart = { elementId: raw.elementId, requiredQty }
  if (typeof raw.name === 'string' && raw.name) part.name = raw.name
  if (typeof raw.imageUrl === 'string' && raw.imageUrl) part.imageUrl = raw.imageUrl
  return part
}

function normalizePartList(raw: unknown, fallbackTimestamp: string): PartList | null {
  if (!isObject(raw)) return null
  const parts = Array.isArray(raw.parts)
    ? raw.parts
        .map(normalizeSetPart)
        .filter((part): part is SetPart => part !== null)
    : []
  const label = typeof raw.label === 'string' ? raw.label.trim() : ''
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    label: label || 'Set list',
    importedAt:
      typeof raw.importedAt === 'string' && raw.importedAt
        ? raw.importedAt
        : fallbackTimestamp,
    parts,
  }
}

function normalizePartLists(raw: UnknownRecord, timestamp: string): PartList[] {
  if (Array.isArray(raw.partLists)) {
    return raw.partLists
      .map((list) => normalizePartList(list, timestamp))
      .filter((list): list is PartList => list !== null)
  }

  const legacyParts = Array.isArray(raw.parts)
    ? raw.parts
        .map(normalizeSetPart)
        .filter((part): part is SetPart => part !== null)
    : []
  if (legacyParts.length === 0) return []

  return [
    {
      id: crypto.randomUUID(),
      label: 'Set list',
      importedAt: timestamp,
      parts: legacyParts,
    },
  ]
}

function normalizeProject(raw: unknown): Project | null {
  if (!isObject(raw)) return null
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null

  const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : ''
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : ''
  const timestamp = updatedAt || createdAt || new Date().toISOString()
  const excludedElementIds = Array.isArray(raw.excludedElementIds)
    ? raw.excludedElementIds.filter((id): id is ElementId => typeof id === 'string')
    : []

  return {
    id: raw.id,
    name: raw.name,
    createdAt,
    updatedAt,
    partLists: normalizePartLists(raw, timestamp),
    orders: Array.isArray(raw.orders) ? (raw.orders as Project['orders']) : [],
    excludedElementIds,
  }
}

/** Migrate persisted state to the current schema version. */
export function migratePersistedState(raw: unknown): AppPersistedState {
  if (!isObject(raw)) {
    return {
      version: 2,
      projects: [],
      activeProjectId: null,
      theme: 'system',
    }
  }

  const theme = normalizeTheme(raw.theme)
  const projects = (Array.isArray(raw.projects) ? raw.projects : [])
    .map(normalizeProject)
    .filter((p): p is Project => p !== null)
  const activeProjectId =
    typeof raw.activeProjectId === 'string' || raw.activeProjectId === null
      ? (raw.activeProjectId as string | null)
      : null

  return {
    version: 2,
    projects,
    activeProjectId,
    theme,
  }
}

function normalizeTheme(value: unknown): ThemeMode {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}
