import { Pencil, Trash2 } from 'lucide-react'
import type { Project } from '@/domain/types'
import { useAppStore } from '@/store/useAppStore'

interface OrdersPanelProps {
  project: Project
}

export function OrdersPanel({ project }: OrdersPanelProps) {
  const removeOrder = useAppStore((s) => s.removeOrder)
  const renameOrder = useAppStore((s) => s.renameOrder)

  if (project.orders.length === 0) {
    return (
      <section
        className="rounded-xl border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]"
        aria-label="Orders"
      >
        No PaB orders imported yet.
      </section>
    )
  }

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      aria-label="Orders"
    >
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold">Orders ({project.orders.length})</h2>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {project.orders.map((order) => {
          const pieces = order.lines.reduce((s, l) => s + l.quantity, 0)
          return (
            <li
              key={order.id}
              className="flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{order.label}</p>
                <p className="text-xs text-[var(--muted)]">
                  {order.lines.length} elements · {pieces} pieces ·{' '}
                  {new Date(order.importedAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                aria-label={`Rename ${order.label}`}
                onClick={() => {
                  const next = window.prompt('Rename order', order.label)
                  if (next !== null) renameOrder(project.id, order.id, next)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="btn-icon"
                aria-label={`Remove ${order.label}`}
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove order “${order.label}”? Quantities will be subtracted from progress.`,
                    )
                  ) {
                    removeOrder(project.id, order.id)
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
