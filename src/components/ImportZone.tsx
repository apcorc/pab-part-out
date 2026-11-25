import { useEffect, useRef, useState } from 'react'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { InlineBanner } from '@/components/ui/InlineBanner'
import {
  isBrickLinkSetList,
  parseSetListText,
  type SetListParseResult,
} from '@/lib/import/parseSetList'
import type { RejectedBrickLinkItem } from '@/lib/import/parseBrickLink'
import { parsePabOrderFile } from '@/lib/import/parsePabOrder'
import { brickLinkItemsToXml } from '@/lib/export/toBrickLinkXml'
import { downloadTextFile } from '@/lib/export/toLegoCsv'
import {
  getCachedCatalog,
  loadRebrickableCatalog,
} from '@/lib/rebrickable/catalog'
import type { Project, SetPart } from '@/domain/types'
import { useAppStore } from '@/store/useAppStore'

interface ImportZoneProps {
  project: Project
}

interface PendingBom {
  parts: SetPart[]
  warnings: string[]
  fileName: string
}

interface RejectedDownload {
  fileName: string
  xml: string
  count: number
}

function rejectedDownloadName(fileName: string): string {
  const base =
    fileName.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_') || 'bricklink'
  return `${base}-rejected.xml`
}

function rejectionNotice(fileName: string, rejected: RejectedBrickLinkItem[]): RejectedDownload | null {
  if (rejected.length === 0) return null
  return {
    fileName,
    xml: brickLinkItemsToXml(
      rejected.map((row) => ({
        itemType: row.item.itemType,
        itemId: row.item.itemId,
        colorId: row.item.colorId,
        colorText: row.item.colorText,
        quantity: row.item.quantity,
        remarks: row.reason,
      })),
    ),
    count: rejected.length,
  }
}

export function ImportZone({ project }: ImportZoneProps) {
  const replaceBom = useAppStore((s) => s.replaceBom)
  const mergeBom = useAppStore((s) => s.mergeBom)
  const addOrder = useAppStore((s) => s.addOrder)

  const [messages, setMessages] = useState<{
    tone: 'success' | 'error' | 'info'
    title?: string
    items: string[]
  } | null>(null)
  const [pendingBom, setPendingBom] = useState<PendingBom | null>(null)
  const [rejectedDownload, setRejectedDownload] = useState<RejectedDownload | null>(null)

  const downloadRejected = () => {
    if (!rejectedDownload) return
    downloadTextFile(
      rejectedDownload.xml,
      rejectedDownloadName(rejectedDownload.fileName),
      'application/xml;charset=utf-8',
    )
  }

  const noteRejections = (fileName: string, rejected: RejectedBrickLinkItem[]) => {
    setRejectedDownload(rejectionNotice(fileName, rejected))
  }

  const applyBom = (
    parts: SetPart[],
    warnings: string[],
    fileName: string,
    mode: 'replace' | 'merge',
    rejectedCount = 0,
  ) => {
    if (mode === 'merge') {
      const existingIds = new Set(project.parts.map((part) => part.elementId))
      let added = 0
      let combined = 0
      for (const part of parts) {
        if (existingIds.has(part.elementId)) combined += 1
        else added += 1
      }
      mergeBom(project.id, parts)
      const items = [
        `${added} new element${added === 1 ? '' : 's'} added`,
      ]
      if (combined > 0) {
        items.push(
          combined === 1
            ? '1 matching element had its quantity combined'
            : `${combined} matching elements had their quantities combined`,
        )
      }
      setMessages({
        tone: rejectedCount > 0 ? 'info' : 'success',
        title: `Added parts from ${fileName}`,
        items: [...items, ...warnings],
      })
      return
    }

    replaceBom(project.id, parts)
    setMessages({
      tone: rejectedCount > 0 ? 'info' : 'success',
      title: `Loaded set list from ${fileName}`,
      items: [`${parts.length} unique element(s)`, ...warnings],
    })
  }

  const onSetFiles = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    const text = await file.text()
    setRejectedDownload(null)
    let catalog = getCachedCatalog()
    if (isBrickLinkSetList(file.name, text)) {
      if (!catalog?.loaded) {
        setMessages({
          tone: 'info',
          title: `Reading ${file.name}`,
          items: ['Matching BrickLink parts to LEGO element IDs.'],
        })
      }
      try {
        catalog = await loadRebrickableCatalog()
      } catch (err: unknown) {
        setMessages({
          tone: 'error',
          title: `Could not import ${file.name}`,
          items: [
            'BrickLink files need the Rebrickable catalog to map part and color to a LEGO element ID.',
            err instanceof Error ? err.message : String(err),
          ],
        })
        return
      }
    }

    const result: SetListParseResult = parseSetListText(file.name, text, catalog)
    noteRejections(file.name, result.rejected)
    if (result.data.length === 0) {
      const items = [
        ...result.errors.map((e) =>
          e.row ? `Row ${e.row}: ${e.message}` : e.message,
        ),
        ...result.warnings,
      ]
      setMessages({
        tone: 'error',
        title: `Could not import ${file.name}`,
        items: items.length > 0 ? items : ['Nothing to import'],
      })
      return
    }

    const warnings = [
      ...result.warnings,
      ...result.errors.map((e) =>
        e.row ? `Skipped row ${e.row}: ${e.message}` : e.message,
      ),
    ]

    if (project.parts.length > 0) {
      setMessages(null)
      setPendingBom({ parts: result.data, warnings, fileName: file.name })
      return
    }

    applyBom(result.data, warnings, file.name, 'replace', result.rejected.length)
  }

  const onOrderFiles = async (files: File[]) => {
    const summaries: string[] = []
    const errors: string[] = []

    for (const file of files) {
      const result = await parsePabOrderFile(file)
      if (result.data.lines.length === 0) {
        errors.push(
          `${file.name}: ${result.errors.map((e) => e.message).join('; ') || 'no lines'}`,
        )
        continue
      }
      addOrder(project.id, result.data)
      const pieceCount = result.data.lines.reduce((s, l) => s + l.quantity, 0)
      summaries.push(
        `${file.name}: ${result.data.lines.length} elements / ${pieceCount} pieces`,
      )
      for (const w of result.warnings) summaries.push(`${file.name}: ${w}`)
      for (const e of result.errors) {
        errors.push(`${file.name} row ${e.row}: ${e.message}`)
      }
    }

    setMessages({
      tone: errors.length && !summaries.length ? 'error' : 'success',
      title: 'Order import',
      items: [...summaries, ...errors],
    })
  }

  return (
    <section className="space-y-3" aria-label="Import">
      <div className="grid gap-3 md:grid-cols-2">
        <FileDropzone
          label="Upload set parts list"
          hint={
            project.parts.length > 0
              ? 'CSV, JSON, or BrickLink XML · add or replace'
              : 'CSV, JSON, or BrickLink XML'
          }
          accept=".csv,.json,.xml,.bsx,.txt,text/csv,application/json,text/xml,application/xml,text/plain"
          onFiles={onSetFiles}
        />
        <FileDropzone
          label="Drop PaB order CSVs"
          hint="Multiple files OK · name / Element ID / quantity / image"
          accept=".csv,text/csv"
          multiple
          onFiles={onOrderFiles}
        />
      </div>

      {messages ? (
        <InlineBanner
          tone={messages.tone}
          title={messages.title}
          messages={messages.items}
          action={
            rejectedDownload
              ? { label: 'Download rejected XML', onClick: downloadRejected }
              : undefined
          }
          onDismiss={() => {
            setMessages(null)
            setRejectedDownload(null)
          }}
        />
      ) : null}

      {pendingBom ? (
        <BomChoiceDialog
          pending={pendingBom}
          existingCount={project.parts.length}
          onAdd={() => {
            applyBom(
              pendingBom.parts,
              pendingBom.warnings,
              pendingBom.fileName,
              'merge',
              rejectedDownload?.count ?? 0,
            )
            setPendingBom(null)
          }}
          onReplace={() => {
            applyBom(
              pendingBom.parts,
              pendingBom.warnings,
              pendingBom.fileName,
              'replace',
              rejectedDownload?.count ?? 0,
            )
            setPendingBom(null)
          }}
          onCancel={() => {
            setPendingBom(null)
            if (!rejectedDownload) return
            setMessages({
              tone: 'info',
              title: 'Set list was not changed',
              items: [
                `${rejectedDownload.count} rejected ${rejectedDownload.count === 1 ? 'item' : 'items'} from ${rejectedDownload.fileName} can still be downloaded.`,
              ],
            })
          }}
        />
      ) : null}
    </section>
  )
}

function BomChoiceDialog({
  pending,
  existingCount,
  onAdd,
  onReplace,
  onCancel,
}: {
  pending: PendingBom
  existingCount: number
  onAdd: () => void
  onReplace: () => void
  onCancel: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCancelRef = useRef(onCancel)

  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const incoming = pending.parts.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bom-choice-title"
        aria-describedby="bom-choice-message"
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="bom-choice-title" className="font-display text-lg font-semibold">
          This project already has a set list
        </h2>
        <p id="bom-choice-message" className="mt-2 text-sm text-[var(--muted)]">
          {`${pending.fileName} has ${incoming} ${incoming === 1 ? 'element' : 'elements'}. The current list has ${existingCount} ${existingCount === 1 ? 'element' : 'elements'}. Imported orders are kept either way.`}
        </p>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-left transition-colors hover:border-[var(--accent)]"
            onClick={onAdd}
          >
            <span className="block text-sm font-semibold">Add to existing list</span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              Keep the current parts and add these. Matching element IDs have
              their quantities combined.
            </span>
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--border)] px-3 py-3 text-left transition-colors hover:border-[var(--error)]"
            onClick={onReplace}
          >
            <span className="block text-sm font-semibold">Replace set list</span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              Remove the current list and use only this file.
            </span>
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
