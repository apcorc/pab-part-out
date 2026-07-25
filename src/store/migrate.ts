import type {
  AppPersistedState,
  ElementId,
  Project,
  ThemeMode,
} from '@/domain/types'

type UnknownRecord = Record<string, unknown>

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeProject(raw: unknown): Project | null {
  if (!isObject(raw)) return null
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null

  const excludedElementIds = Array.isArray(raw.excludedElementIds)
    ? raw.excludedElementIds.filter((id): id is ElementId => typeof id === 'string')
    : []

  return {
    id: raw.id,
    name: raw.name,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
    parts: Array.isArray(raw.parts) ? (raw.parts as Project['parts']) : [],
    orders: Array.isArray(raw.orders) ? (raw.orders as Project['orders']) : [],
    excludedElementIds,
  }
}

/** Migrate persisted state to the current schema version. */
export function migratePersistedState(raw: unknown): AppPersistedState {
  if (!isObject(raw)) {
    return {
      version: 1,
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
    version: 1,
    projects,
    activeProjectId,
    theme,
  }
}

function normalizeTheme(value: unknown): ThemeMode {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}
