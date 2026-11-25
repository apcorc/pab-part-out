import Papa from 'papaparse'
import type { ParseResult, SetPart } from '@/domain/types'
import { mergeParts } from '@/domain/diff'
import type { RebrickableCatalog } from '@/lib/rebrickable/catalog'
import {
  brickLinkItemsToSetParts,
  isBrickLinkDelimited,
  isBrickLinkXml,
  parseBrickLinkDelimited,
  parseBrickLinkXml,
  type BrickLinkItem,
  type RejectedBrickLinkItem,
} from './parseBrickLink'
import {
  normalizeHeaders,
  parseElementId,
  parseQuantity,
} from './normalize'

function rowsToParts(
  rows: Record<string, unknown>[],
  headerMap: Record<string, string | undefined>,
): ParseResult<SetPart[]> {
  const errors: ParseResult<SetPart[]>['errors'] = []
  const warnings: string[] = []
  const parts: SetPart[] = []

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
            'CSV must include elementId and quantity columns, or BrickLink item, color ID, and quantity columns',
        },
      ],
      warnings,
    }
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2
    const elementId = parseElementId(row[elementKey], rowNum, errors)
    const quantity = parseQuantity(row[qtyKey], rowNum, errors)
    if (elementId === null || quantity === null) return

    const name = nameKey ? String(row[nameKey] ?? '').trim() || undefined : undefined
    const imageUrl = imageKey
      ? String(row[imageKey] ?? '').trim() || undefined
      : undefined

    parts.push({
      elementId,
      requiredQty: quantity,
      name,
      imageUrl,
    })
  })

  const merged = mergeParts(parts)
  if (merged.length < parts.length) {
    warnings.push(
      `Merged ${parts.length - merged.length} duplicate elementId row(s)`,
    )
  }

  return { data: merged, errors, warnings }
}

export function parseSetListCsv(text: string): ParseResult<SetPart[]> {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })

  if (parsed.errors.length && parsed.data.length === 0) {
    return {
      data: [],
      errors: parsed.errors.map((e) => ({
        row: e.row ?? 0,
        message: e.message,
      })),
      warnings: [],
    }
  }

  const fields = parsed.meta.fields ?? []
  const headerMap = normalizeHeaders(fields)
  return rowsToParts(parsed.data, headerMap)
}

export function parseSetListJson(text: string): ParseResult<SetPart[]> {
  const errors: ParseResult<SetPart[]>['errors'] = []
  const warnings: string[] = []

  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return {
      data: [],
      errors: [{ row: 0, message: 'Invalid JSON' }],
      warnings,
    }
  }

  if (!Array.isArray(raw)) {
    return {
      data: [],
      errors: [{ row: 0, message: 'JSON must be an array of parts' }],
      warnings,
    }
  }

  const parts: SetPart[] = []
  raw.forEach((item, index) => {
    const rowNum = index + 1
    if (typeof item !== 'object' || item === null) {
      errors.push({ row: rowNum, message: 'Row is not an object' })
      return
    }
    const record = item as Record<string, unknown>
    const elementId = parseElementId(
      record.elementId ?? record.element_id,
      rowNum,
      errors,
    )
    const quantity = parseQuantity(
      record.quantity ?? record.qty ?? record.requiredQty,
      rowNum,
      errors,
    )
    if (elementId === null || quantity === null) return

    parts.push({
      elementId,
      requiredQty: quantity,
      name: typeof record.name === 'string' ? record.name : undefined,
      imageUrl:
        typeof record.imageUrl === 'string'
          ? record.imageUrl
          : typeof record.image === 'string'
            ? record.image
            : undefined,
    })
  })

  const merged = mergeParts(parts)
  if (merged.length < parts.length) {
    warnings.push(
      `Merged ${parts.length - merged.length} duplicate elementId row(s)`,
    )
  }

  return { data: merged, errors, warnings }
}

function isElementIdCsv(text: string): boolean {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    preview: 1,
    skipEmptyLines: 'greedy',
  })
  const headerMap = normalizeHeaders(parsed.data[0] ?? [])
  return Boolean(headerMap.elementId && headerMap.quantity)
}

function isJsonSetList(fileName: string, text: string): boolean {
  if (fileName.toLowerCase().endsWith('.json')) return true
  const head = text.trimStart()
  return head.startsWith('[') || head.startsWith('{')
}

/** True when the file is a BrickLink wanted list or inventory, not an element-ID CSV. */
export function isBrickLinkSetList(fileName: string, text: string): boolean {
  const cleaned = text.replace(/^\uFEFF/, '')
  if (isJsonSetList(fileName, cleaned)) return false
  if (isBrickLinkXml(fileName, cleaned)) return true
  if (isElementIdCsv(cleaned)) return false
  return isBrickLinkDelimited(cleaned)
}

export interface SetListParseResult extends ParseResult<SetPart[]> {
  rejected: RejectedBrickLinkItem[]
}

function finishBrickLink(
  parsed: ParseResult<BrickLinkItem[]>,
  catalog: RebrickableCatalog | null,
): SetListParseResult {
  if (!catalog?.loaded) {
    return {
      data: [],
      errors: [
        {
          row: 0,
          message:
            'BrickLink import needs the Rebrickable catalog (elements.csv and parts.csv).',
        },
        ...parsed.errors,
      ],
      warnings: parsed.warnings,
      rejected: [],
    }
  }
  if (parsed.data.length === 0) {
    return {
      data: [],
      errors:
        parsed.errors.length > 0
          ? parsed.errors
          : [{ row: 0, message: 'No BrickLink items found' }],
      warnings: parsed.warnings,
      rejected: [],
    }
  }

  const resolved = brickLinkItemsToSetParts(parsed.data, catalog)
  return {
    data: resolved.data,
    errors: [...parsed.errors, ...resolved.errors],
    warnings: [...parsed.warnings, ...resolved.warnings],
    rejected: resolved.rejected,
  }
}

export function parseSetListText(
  fileName: string,
  text: string,
  catalog: RebrickableCatalog | null = null,
): SetListParseResult {
  const cleaned = text.replace(/^\uFEFF/, '')
  if (isJsonSetList(fileName, cleaned)) {
    return { ...parseSetListJson(cleaned), rejected: [] }
  }
  if (isBrickLinkSetList(fileName, cleaned)) {
    const parsed = isBrickLinkXml(fileName, cleaned)
      ? parseBrickLinkXml(cleaned)
      : parseBrickLinkDelimited(cleaned)
    return finishBrickLink(parsed, catalog)
  }
  return { ...parseSetListCsv(cleaned), rejected: [] }
}

export async function parseSetListFile(
  file: File,
  catalog: RebrickableCatalog | null = null,
): Promise<SetListParseResult> {
  const text = await file.text()
  return parseSetListText(file.name, text, catalog)
}
