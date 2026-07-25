import Papa from 'papaparse'
import type { Order, OrderLine, ParseResult } from '@/domain/types'
import {
  normalizeHeaders,
  parseElementId,
  parseQuantity,
} from './normalize'

function rowsToLines(
  rows: Record<string, unknown>[],
  headerMap: Record<string, string | undefined>,
): ParseResult<OrderLine[]> {
  const errors: ParseResult<OrderLine[]>['errors'] = []
  const warnings: string[] = []
  const lines: OrderLine[] = []

  const elementKey = headerMap.elementId
  const qtyKey = headerMap.quantity
  const nameKey = headerMap.name
  const imageKey = headerMap.image

  if (!elementKey || !qtyKey) {
    return {
      data: [],
      errors: [
        {
          row: 0,
          message:
            'Order CSV must include elementId (or Element ID) and quantity columns',
        },
      ],
      warnings,
    }
  }

  const qtyByElement = new Map<string, OrderLine>()

  rows.forEach((row, index) => {
    const rowNum = index + 2
    const elementId = parseElementId(row[elementKey], rowNum, errors)
    const quantity = parseQuantity(row[qtyKey], rowNum, errors)
    if (elementId === null || quantity === null) return

    const name = nameKey ? String(row[nameKey] ?? '').trim() || undefined : undefined
    const imageUrl = imageKey
      ? String(row[imageKey] ?? '').trim() || undefined
      : undefined

    const existing = qtyByElement.get(elementId)
    if (existing) {
      existing.quantity += quantity
      if (!existing.name && name) existing.name = name
      if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl
    } else {
      qtyByElement.set(elementId, { elementId, quantity, name, imageUrl })
    }
  })

  for (const line of qtyByElement.values()) lines.push(line)

  if (lines.length < rows.length - errors.length) {
    const merged = rows.length - errors.length - lines.length
    if (merged > 0) {
      warnings.push(`Merged ${merged} duplicate elementId row(s) in order`)
    }
  }

  return { data: lines, errors, warnings }
}

export function parsePabOrderCsv(
  text: string,
  label: string,
): ParseResult<Order> {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors.length && parsed.data.length === 0) {
    return {
      data: {
        id: crypto.randomUUID(),
        label,
        importedAt: new Date().toISOString(),
        source: 'pab-csv',
        lines: [],
      },
      errors: parsed.errors.map((e) => ({
        row: e.row ?? 0,
        message: e.message,
      })),
      warnings: [],
    }
  }

  const fields = parsed.meta.fields ?? []
  const headerMap = normalizeHeaders(fields)
  const { data: lines, errors, warnings } = rowsToLines(parsed.data, headerMap)

  return {
    data: {
      id: crypto.randomUUID(),
      label,
      importedAt: new Date().toISOString(),
      source: 'pab-csv',
      lines,
    },
    errors,
    warnings,
  }
}

export async function parsePabOrderFile(file: File): Promise<ParseResult<Order>> {
  const text = await file.text()
  return parsePabOrderCsv(text, file.name)
}
