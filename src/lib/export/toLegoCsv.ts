import type { DiffRow } from '@/domain/types'
import { remainingParts } from '@/domain/diff'

export function toLegoCsv(rows: DiffRow[]): string {
  const remaining = remainingParts(rows)
  const lines = ['elementId,quantity']
  for (const part of remaining) {
    lines.push(`${part.elementId},${part.quantity}`)
  }
  return `${lines.join('\n')}\n`
}

export function downloadTextFile(
  content: string,
  filename: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
