import { useState } from 'react'
import { FileDropzone } from '@/components/ui/FileDropzone'
import { InlineBanner } from '@/components/ui/InlineBanner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { parseSetListFile } from '@/lib/import/parseSetList'
import { parsePabOrderFile } from '@/lib/import/parsePabOrder'
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

export function ImportZone({ project }: ImportZoneProps) {
  const replaceBom = useAppStore((s) => s.replaceBom)
  const addOrder = useAppStore((s) => s.addOrder)

  const [messages, setMessages] = useState<{
    tone: 'success' | 'error' | 'info'
    title?: string
    items: string[]
  } | null>(null)
  const [pendingBom, setPendingBom] = useState<PendingBom | null>(null)

  const applyBom = (parts: SetPart[], warnings: string[], fileName: string) => {
    replaceBom(project.id, parts)
    setMessages({
      tone: 'success',
      title: `Loaded set list from ${fileName}`,
      items: [`${parts.length} unique element(s)`, ...warnings],
    })
  }

  const onSetFiles = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    const result = await parseSetListFile(file)
    if (result.data.length === 0) {
      setMessages({
        tone: 'error',
        title: `Could not import ${file.name}`,
        items: result.errors.map((e) =>
          e.row ? `Row ${e.row}: ${e.message}` : e.message,
        ),
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
      setPendingBom({ parts: result.data, warnings, fileName: file.name })
      return
    }

    applyBom(result.data, warnings, file.name)
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
          hint="CSV or JSON · elementId, quantity · replaces BOM"
          accept=".csv,.json,text/csv,application/json"
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
          onDismiss={() => setMessages(null)}
        />
      ) : null}

      <ConfirmDialog
        open={pendingBom !== null}
        title="Replace set list?"
        message="Uploading a new set list replaces the current BOM. Imported orders are kept."
        confirmLabel="Replace"
        danger
        onCancel={() => setPendingBom(null)}
        onConfirm={() => {
          if (!pendingBom) return
          applyBom(pendingBom.parts, pendingBom.warnings, pendingBom.fileName)
          setPendingBom(null)
        }}
      />
    </section>
  )
}
