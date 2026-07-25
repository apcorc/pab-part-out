import type { ProjectStats } from '@/domain/types'

interface ProgressDashboardProps {
  stats: ProjectStats
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  )
}

export function ProgressDashboard({ stats }: ProgressDashboardProps) {
  const pct = Math.round(stats.percentComplete)

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      aria-label="Progress"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Set completion
          </p>
          <p className="font-display text-3xl font-bold tabular-nums">
            {pct}
            <span className="text-lg text-[var(--muted)]">%</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
          <Stat label="Elements" value={stats.uniqueElements} />
          <Stat label="Required" value={stats.totalRequired} />
          <Stat label="Ordered" value={stats.totalOrdered} />
          <Stat label="Remaining" value={stats.totalRemaining} />
        </div>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Percent complete"
      >
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  )
}
