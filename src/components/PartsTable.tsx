import { useMemo, useState } from 'react'
import { Ban, RotateCcw } from 'lucide-react'
import type { DiffRow, ElementId, PartsFilter } from '@/domain/types'
import { useAppStore } from '@/store/useAppStore'

interface PartsTableProps {
  projectId: string
  rows: DiffRow[]
}

const FILTERS: { id: PartsFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'remaining', label: 'Remaining' },
  { id: 'complete', label: 'Complete' },
  { id: 'excluded', label: 'Excluded' },
  { id: 'surplus', label: 'Surplus' },
  { id: 'orphans', label: 'Orphans' },
]

function matchesFilter(row: DiffRow, filter: PartsFilter): boolean {
  switch (filter) {
    case 'remaining':
      return !row.orphan && !row.excluded && row.remaining > 0
    case 'complete':
      return (
        !row.orphan &&
        !row.excluded &&
        row.remaining === 0 &&
        row.required > 0
      )
    case 'excluded':
      return !row.orphan && row.excluded
    case 'surplus':
      return !row.orphan && !row.excluded && row.surplus > 0
    case 'orphans':
      return row.orphan
    default:
      return true
  }
}

export function PartsTable({ projectId, rows }: PartsTableProps) {
  const setPartExcluded = useAppStore((s) => s.setPartExcluded)
  const [filter, setFilter] = useState<PartsFilter>('remaining')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false
      if (!q) return true
      return (
        row.elementId.toLowerCase().includes(q) ||
        (row.name?.toLowerCase().includes(q) ?? false)
      )
    })

    return list.sort((a, b) => {
      if (a.excluded !== b.excluded) return a.excluded ? 1 : -1
      if (a.remaining !== b.remaining) return b.remaining - a.remaining
      return a.elementId.localeCompare(b.elementId)
    })
  }, [rows, filter, search])

  const toggleExcluded = (elementId: ElementId, excluded: boolean) => {
    setPartExcluded(projectId, elementId, excluded)
  }

  if (rows.length === 0) {
    return (
      <section
        className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--muted)]"
        aria-label="Parts"
      >
        Upload a set parts list to see required vs ordered quantities.
      </section>
    )
  }

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      aria-label="Parts table"
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <div
          className="flex flex-wrap gap-1"
          role="tablist"
          aria-label="Filter parts"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                filter === f.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--fg)]'
              }`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex min-w-[12rem] flex-1 items-center sm:max-w-xs">
          <span className="sr-only">Search parts</span>
          <input
            type="search"
            className="input w-full"
            placeholder="Search element ID or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <p className="text-xs text-[var(--muted)] tabular-nums">
          {filtered.length} shown
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_repeat(4,minmax(0,0.7fr))_auto] gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        <div>Element</div>
        <div>Name</div>
        <div className="text-right">Required</div>
        <div className="text-right">Ordered</div>
        <div className="text-right">Remaining</div>
        <div className="text-right">Surplus</div>
        <div className="text-right">Action</div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
          No parts match this filter.
        </p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((row) => (
            <div
              key={row.elementId + String(row.orphan)}
              className={`grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_repeat(4,minmax(0,0.7fr))_auto] gap-2 px-4 py-2.5 text-sm ${
                row.excluded ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-center gap-2 truncate font-mono text-xs">
                <span className="truncate">{row.elementId}</span>
                {row.orphan ? <span className="badge-warn">orphan</span> : null}
                {row.excluded ? (
                  <span className="badge-muted">excluded</span>
                ) : null}
              </div>
              <div className="truncate text-[var(--muted)]">{row.name ?? '—'}</div>
              <div className="text-right tabular-nums">{row.required}</div>
              <div className="text-right tabular-nums">
                {row.excluded ? '—' : row.ordered}
              </div>
              <div
                className={`text-right tabular-nums font-medium ${
                  !row.excluded && row.remaining > 0 ? 'text-[var(--accent)]' : ''
                }`}
              >
                {row.excluded ? '—' : row.remaining}
              </div>
              <div
                className={`text-right tabular-nums ${
                  !row.excluded && row.surplus > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : ''
                }`}
              >
                {row.excluded ? '—' : row.surplus || '—'}
              </div>
              <div className="flex justify-end">
                {row.orphan ? (
                  <span className="text-xs text-[var(--muted)]">—</span>
                ) : row.excluded ? (
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-xs"
                    title="Include this part again"
                    onClick={() => toggleExcluded(row.elementId, false)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Include
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-xs"
                    title="Exclude from remaining and exports"
                    onClick={() => toggleExcluded(row.elementId, true)}
                  >
                    <Ban className="h-3.5 w-3.5" aria-hidden />
                    Exclude
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
