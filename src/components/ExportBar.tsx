import { useState } from 'react'
import { Download, Info } from 'lucide-react'
import type { DiffRow } from '@/domain/types'
import { remainingParts } from '@/domain/diff'
import { downloadTextFile, toLegoCsv } from '@/lib/export/toLegoCsv'
import { toBrickLinkXml } from '@/lib/export/toBrickLinkXml'
import {
  mappingsForRemaining,
  type RebrickableCatalog,
} from '@/lib/rebrickable/catalog'
import { InlineBanner } from '@/components/ui/InlineBanner'

interface ExportBarProps {
  projectName: string
  rows: DiffRow[]
  catalog: RebrickableCatalog | null
  catalogLoading: boolean
  catalogError: string | null
}

export function ExportBar({
  projectName,
  rows,
  catalog,
  catalogLoading,
  catalogError,
}: ExportBarProps) {
  const remaining = remainingParts(rows)
  const [notice, setNotice] = useState<{
    tone: 'success' | 'error' | 'info'
    title?: string
    items: string[]
  } | null>(null)

  const brickLinkReady = Boolean(catalog?.loaded) && remaining.length > 0
  const safe = projectName.replace(/[^\w.-]+/g, '_').toLowerCase() || 'project'

  const onExportLego = () => {
    downloadTextFile(toLegoCsv(rows), `${safe}-remaining.csv`)
  }

  const onExportBrickLink = () => {
    if (!catalog?.loaded) return
    const { mappings, missing } = mappingsForRemaining(rows, catalog)
    if (mappings.length === 0) {
      setNotice({
        tone: 'error',
        title: 'BrickLink export failed',
        items:
          missing.length > 0
            ? [
                `No mappable elements among ${missing.length} remaining.`,
                ...missing.slice(0, 5).map((id) => `Missing map: ${id}`),
              ]
            : ['Nothing remaining to export.'],
      })
      return
    }

    const { xml, missing: xmlMissing } = toBrickLinkXml(rows, mappings)
    downloadTextFile(xml, `${safe}-remaining-bricklink.xml`, 'application/xml;charset=utf-8')

    const skipped = [...new Set([...missing, ...xmlMissing])]
    setNotice({
      tone: skipped.length ? 'info' : 'success',
      title: 'BrickLink XML exported',
      items: [
        `${mappings.length - xmlMissing.length} item(s) written`,
        ...(skipped.length
          ? [
              `${skipped.length} element(s) skipped (no Rebrickable/BrickLink map)`,
              ...skipped.slice(0, 6).map((id) => id),
            ]
          : []),
      ],
    })
  }

  return (
    <section className="space-y-2" aria-label="Export">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Export remaining</p>
          <p className="text-xs text-[var(--muted)]">
            {remaining.length} element type(s) ·{' '}
            {remaining.reduce((s, p) => s + p.quantity, 0)} pieces left
            {catalogLoading ? ' · loading catalog…' : null}
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
            catalogError
              ? catalogError
              : catalogLoading
                ? 'Loading Rebrickable catalog…'
                : 'Export BrickLink Wanted List XML'
          }
          onClick={onExportBrickLink}
        >
          <Download className="h-4 w-4" aria-hidden />
          BrickLink XML
        </button>
        {catalogError ? (
          <p className="flex w-full items-start gap-1.5 text-xs text-[var(--error)] sm:w-auto">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Catalog error: {catalogError}
          </p>
        ) : null}
      </div>

      {notice ? (
        <InlineBanner
          tone={notice.tone}
          title={notice.title}
          messages={notice.items}
          onDismiss={() => setNotice(null)}
        />
      ) : null}
    </section>
  )
}
