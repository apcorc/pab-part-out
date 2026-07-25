import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ElementId,
  Order,
  Project,
  SetPart,
  ThemeMode,
} from '@/domain/types'
import { mergeParts } from '@/domain/diff'
import { migratePersistedState } from './migrate'

interface AppState {
  version: 1
  projects: Project[]
  activeProjectId: string | null
  theme: ThemeMode

  createProject: (name?: string) => string
  setActiveProject: (id: string | null) => void
  renameProject: (id: string, name: string) => void
  deleteProject: (id: string) => void

  replaceBom: (projectId: string, parts: SetPart[]) => void
  mergeBom: (projectId: string, parts: SetPart[]) => void

  addOrder: (projectId: string, order: Order) => void
  removeOrder: (projectId: string, orderId: string) => void
  renameOrder: (projectId: string, orderId: string, label: string) => void

  setPartExcluded: (
    projectId: string,
    elementId: ElementId,
    excluded: boolean,
  ) => void

  setTheme: (theme: ThemeMode) => void
}

function pruneExcluded(
  excludedElementIds: ElementId[] | undefined,
  parts: SetPart[],
): ElementId[] {
  const bomIds = new Set(parts.map((p) => p.elementId))
  return (excludedElementIds ?? []).filter((id) => bomIds.has(id))
}

function nowIso(): string {
  return new Date().toISOString()
}

function touch(project: Project): Project {
  return { ...project, updatedAt: nowIso() }
}

function updateProject(
  projects: Project[],
  id: string,
  updater: (project: Project) => Project,
): Project[] {
  return projects.map((p) => (p.id === id ? touch(updater(p)) : p))
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      version: 1,
      projects: [],
      activeProjectId: null,
      theme: 'system',

      createProject: (name = 'Untitled project') => {
        const id = crypto.randomUUID()
        const timestamp = nowIso()
        const project: Project = {
          id,
          name: name.trim() || 'Untitled project',
          createdAt: timestamp,
          updatedAt: timestamp,
          parts: [],
          orders: [],
          excludedElementIds: [],
        }
        set((state) => ({
          projects: [project, ...state.projects],
          activeProjectId: id,
        }))
        return id
      },

      setActiveProject: (id) => set({ activeProjectId: id }),

      renameProject: (id, name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        set((state) => ({
          projects: updateProject(state.projects, id, (p) => ({
            ...p,
            name: trimmed,
          })),
        }))
      },

      deleteProject: (id) => {
        const { projects, activeProjectId } = get()
        const next = projects.filter((p) => p.id !== id)
        set({
          projects: next,
          activeProjectId:
            activeProjectId === id ? (next[0]?.id ?? null) : activeProjectId,
        })
      },

      replaceBom: (projectId, parts) => {
        set((state) => ({
          projects: updateProject(state.projects, projectId, (p) => {
            const nextParts = mergeParts(parts)
            return {
              ...p,
              parts: nextParts,
              excludedElementIds: pruneExcluded(p.excludedElementIds, nextParts),
            }
          }),
        }))
      },

      mergeBom: (projectId, parts) => {
        set((state) => ({
          projects: updateProject(state.projects, projectId, (p) => {
            const nextParts = mergeParts([...p.parts, ...parts])
            return {
              ...p,
              parts: nextParts,
              excludedElementIds: pruneExcluded(p.excludedElementIds, nextParts),
            }
          }),
        }))
      },

      addOrder: (projectId, order) => {
        set((state) => ({
          projects: updateProject(state.projects, projectId, (p) => ({
            ...p,
            orders: [...p.orders, order],
          })),
        }))
      },

      removeOrder: (projectId, orderId) => {
        set((state) => ({
          projects: updateProject(state.projects, projectId, (p) => ({
            ...p,
            orders: p.orders.filter((o) => o.id !== orderId),
          })),
        }))
      },

      renameOrder: (projectId, orderId, label) => {
        const trimmed = label.trim()
        if (!trimmed) return
        set((state) => ({
          projects: updateProject(state.projects, projectId, (p) => ({
            ...p,
            orders: p.orders.map((o) =>
              o.id === orderId ? { ...o, label: trimmed } : o,
            ),
          })),
        }))
      },

      setPartExcluded: (projectId, elementId, excluded) => {
        set((state) => ({
          projects: updateProject(state.projects, projectId, (p) => {
            const current = new Set(p.excludedElementIds ?? [])
            if (excluded) current.add(elementId)
            else current.delete(elementId)
            return {
              ...p,
              excludedElementIds: Array.from(current),
            }
          }),
        }))
      },

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'pabpartout-v1',
      version: 1,
      migrate: (persisted) => migratePersistedState(persisted),
      partialize: (state) => ({
        version: state.version,
        projects: state.projects,
        activeProjectId: state.activeProjectId,
        theme: state.theme,
      }),
    },
  ),
)

export function selectActiveProject(state: AppState): Project | null {
  if (!state.activeProjectId) return null
  return state.projects.find((p) => p.id === state.activeProjectId) ?? null
}
