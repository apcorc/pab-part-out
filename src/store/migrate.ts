import type { AppPersistedState, ThemeMode } from '@/domain/types'

type UnknownRecord = Record<string, unknown>

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
  const projects = Array.isArray(raw.projects) ? raw.projects : []
  const activeProjectId =
    typeof raw.activeProjectId === 'string' || raw.activeProjectId === null
      ? (raw.activeProjectId as string | null)
      : null

  return {
    version: 1,
    projects: projects as AppPersistedState['projects'],
    activeProjectId,
    theme,
  }
}

function normalizeTheme(value: unknown): ThemeMode {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  return 'system'
}
