import { Download, Info } from 'lucide-react'
import type { DiffRow } from '@/domain/types'
import { downloadTextFile, toLegoCsv } from '@/lib/export/toLegoCsv'
import { canExportBrickLinkXml } from '@/lib/export/toBrickLinkXml'
import { remainingParts } from '@/domain/diff'

interface ExportBarProps {
  projectName: string
  rows: DiffRow[]
}

export function ExportBar({ projectName, rows }: ExportBarProps) {
  const remaining = remainingParts(rows)
  const brickLinkReady = canExportBrickLinkXml(null)

  const onExportLego = () => {
    const csv = toLegoCsv(rows)
    const safe = projectName.replace(/[^\w.-]+/g, '_').toLowerCase() || 'project'
    downloadTextFile(csv, `${safe}-remaining.csv`)
  }

  return (
    <section
      className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
      aria-label="Export"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Export remaining</p>
        <p className="text-xs text-[var(--muted)]">
          {remaining.length} element type(s) ·{' '}
          {remaining.reduce((s, p) => s + p.quantity, 0)} pieces left
        </p>
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={remaining.length === 0}
        onClick={onExportLego}
      >
        <Download className="h-4 w-4" aria-hidden />
        LEGO CSV
      </button>
      <button
        type="button"
        className="btn-secondary"
        disabled={!brickLinkReady}
        title={
          brickLinkReady
            ? 'Export BrickLink Wanted List XML'
            : 'Needs Element ID → BrickLink item/color mapping (not available yet)'
        }
        onClick={() => {
          /* gated until mapping data exists */
        }}
      >
        BrickLink XML
      </button>
      {!brickLinkReady ? (
        <p className="flex w-full items-start gap-1.5 text-xs text-[var(--muted)] sm:w-auto">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          BrickLink XML is gated until an Element→part/color map is available.
        </p>
      ) : null}
    </section>
  )
}
