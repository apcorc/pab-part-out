import { Pencil, Trash2 } from 'lucide-react'
import type { Project } from '@/domain/types'
import { useAppStore } from '@/store/useAppStore'

interface SetListsPanelProps {
  project: Project
}

export function SetListsPanel({ project }: SetListsPanelProps) {
  const removePartList = useAppStore((s) => s.removePartList)
  const renamePartList = useAppStore((s) => s.renamePartList)

  const lists = project.partLists ?? []

  if (lists.length === 0) {
    return (
      <section
        className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]"
        aria-label="Set lists"
      >
        No set lists imported yet.
      </section>
    )
  }

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      aria-label="Set lists"
    >
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold">
          Set lists ({lists.length})
        </h2>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {lists.map((list) => {
          const pieces = list.parts.reduce((sum, part) => sum + part.requiredQty, 0)
          return (
            <li
              key={list.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{list.label}</p>
                <p className="text-xs text-[var(--muted)]">
                  {list.parts.length} elements · {pieces} pieces ·{' '}
                  {new Date(list.importedAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                aria-label={`Rename ${list.label}`}
                onClick={() => {
                  const next = window.prompt('Rename set list', list.label)
                  if (next !== null) renamePartList(project.id, list.id, next)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="btn-icon"
                aria-label={`Remove ${list.label}`}
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove set list “${list.label}”? Its quantities will be subtracted from the project. Imported orders are kept.`,
                    )
                  ) {
                    removePartList(project.id, list.id)
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
