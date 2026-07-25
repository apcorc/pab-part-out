import { useState } from 'react'
import { FolderPlus, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ThemeToggle } from '@/components/ThemeToggle'
import { selectActiveProject, useAppStore } from '@/store/useAppStore'

interface SidebarProps {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const projects = useAppStore((s) => s.projects)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const createProject = useAppStore((s) => s.createProject)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const renameProject = useAppStore((s) => s.renameProject)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const active = useAppStore(selectActiveProject)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const onRename = (id: string, current: string) => {
    const next = window.prompt('Rename project', current)
    if (next !== null) renameProject(id, next)
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-4">
        <p className="font-display text-lg font-bold tracking-tight">
          PABPartOut
        </p>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Pick a Brick inventory
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Projects
        </span>
        <button
          type="button"
          className="btn-icon"
          aria-label="New project"
          title="New project"
          onClick={() => createProject(`Project ${projects.length + 1}`)}
        >
          <FolderPlus className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3" aria-label="Projects">
        {projects.length === 0 ? (
          <p className="px-2 text-xs text-[var(--muted)]">
            No projects yet. Create one to get started.
          </p>
        ) : (
          <ul className="space-y-1">
            {projects.map((project) => {
              const selected = project.id === activeProjectId
              return (
                <li key={project.id}>
                  <div
                    className={`group flex items-center gap-1 rounded-lg ${
                      selected ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-2)]'
                    }`}
                  >
                    <button
                      type="button"
                      className={`min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm ${
                        selected ? 'font-semibold text-[var(--accent)]' : ''
                      }`}
                      onClick={() => {
                        setActiveProject(project.id)
                        onNavigate?.()
                      }}
                    >
                      {project.name}
                    </button>
                    <button
                      type="button"
                      className="btn-icon opacity-0 group-hover:opacity-100 focus:opacity-100"
                      aria-label={`Rename ${project.name}`}
                      onClick={() => onRename(project.id, project.name)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="btn-icon opacity-0 group-hover:opacity-100 focus:opacity-100"
                      aria-label={`Delete ${project.name}`}
                      onClick={() => setDeleteId(project.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <ThemeToggle />
        {active ? (
          <p className="mt-2 text-[10px] text-[var(--muted)]">
            Local-only · saved in this browser
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete project?"
        message="This removes the set list and all imported orders for this project. This cannot be undone."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteProject(deleteId)
          setDeleteId(null)
        }}
      />
    </aside>
  )
}
