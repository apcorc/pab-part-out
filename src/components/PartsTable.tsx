import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { DiffRow, PartsFilter } from '@/domain/types'

interface PartsTableProps {
  rows: DiffRow[]
}

const FILTERS: { id: PartsFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'remaining', label: 'Remaining' },
  { id: 'complete', label: 'Complete' },
  { id: 'surplus', label: 'Surplus' },
  { id: 'orphans', label: 'Orphans' },
]

function matchesFilter(row: DiffRow, filter: PartsFilter): boolean {
  switch (filter) {
    case 'remaining':
      return !row.orphan && row.remaining > 0
    case 'complete':
      return !row.orphan && row.remaining === 0 && row.required > 0
    case 'surplus':
      return row.surplus > 0 && !row.orphan
    case 'orphans':
      return row.orphan
    default:
      return true
  }
}

export function PartsTable({ rows }: PartsTableProps) {
  const [filter, setFilter] = useState<PartsFilter>('remaining')
  const [search, setSearch] = useState('')
  const parentRef = useRef<HTMLDivElement>(null)

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
      if (a.remaining !== b.remaining) return b.remaining - a.remaining
      return a.elementId.localeCompare(b.elementId)
    })
  }, [rows, filter, search])

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  })

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
      className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"
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

      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_repeat(4,minmax(0,0.7fr))] gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        <div>Element</div>
        <div>Name</div>
        <div className="text-right">Required</div>
        <div className="text-right">Ordered</div>
        <div className="text-right">Remaining</div>
        <div className="text-right">Surplus</div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
          No parts match this filter.
        </p>
      ) : (
        <div ref={parentRef} className="max-h-[28rem] overflow-auto">
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = filtered[virtualRow.index]
              return (
                <div
                  key={row.elementId + String(row.orphan)}
                  className="absolute left-0 top-0 grid w-full grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_repeat(4,minmax(0,0.7fr))] gap-2 border-b border-[var(--border)] px-4 py-2.5 text-sm"
                  style={{
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="flex items-center gap-2 truncate font-mono text-xs">
                    {row.imageUrl ? (
                      <img
                        src={row.imageUrl}
                        alt=""
                        className="h-6 w-6 rounded object-contain bg-[var(--surface-2)]"
                      />
                    ) : null}
                    <span className="truncate">{row.elementId}</span>
                    {row.orphan ? (
                      <span className="badge-warn">orphan</span>
                    ) : null}
                  </div>
                  <div className="truncate text-[var(--muted)]">
                    {row.name ?? '—'}
                  </div>
                  <div className="text-right tabular-nums">{row.required}</div>
                  <div className="text-right tabular-nums">{row.ordered}</div>
                  <div
                    className={`text-right tabular-nums font-medium ${
                      row.remaining > 0 ? 'text-[var(--accent)]' : ''
                    }`}
                  >
                    {row.remaining}
                  </div>
                  <div
                    className={`text-right tabular-nums ${
                      row.surplus > 0 ? 'text-amber-600 dark:text-amber-400' : ''
                    }`}
                  >
                    {row.surplus || '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
