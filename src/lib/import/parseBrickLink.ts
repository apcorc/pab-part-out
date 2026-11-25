import Papa from 'papaparse'
import type { ParseResult, ParseRowError, SetPart } from '@/domain/types'
import { mergeParts } from '@/domain/diff'
import {
  lookupElementForBrickLink,
  type RebrickableCatalog,
} from '@/lib/rebrickable/catalog'
import { parseQuantity } from './normalize'

export interface BrickLinkItem {
  itemType: string
  itemId: string
  colorId: number | null
  /** Original color text when it is not a numeric BrickLink color ID. */
  colorText?: string
  quantity: number
  name?: string
  row: number
}

export interface RejectedBrickLinkItem {
  item: BrickLinkItem
  reason: string
}

const ITEM_TYPES: Record<string, string> = {
  P: 'PART',
  PART: 'PART',
  M: 'MINIFIG',
  MINIFIG: 'MINIFIG',
  MINIFIGURE: 'MINIFIG',
  S: 'SET',
  SET: 'SET',
  B: 'BOOK',
  BOOK: 'BOOK',
  G: 'GEAR',
  GEAR: 'GEAR',
  C: 'CATALOG',
  CATALOG: 'CATALOG',
  I: 'INSTRUCTION',
  INSTRUCTION: 'INSTRUCTION',
  O: 'ORIGINAL_BOX',
  ORIGINAL_BOX: 'ORIGINAL_BOX',
  U: 'UNSORTED_LOT',
  UNSORTED_LOT: 'UNSORTED_LOT',
}

const HEADER_ALIASES: Record<string, string> = {
  itemtype: 'itemType',
  'item type': 'itemType',
  item_type: 'itemType',
  type: 'itemType',
  itemid: 'itemId',
  'item id': 'itemId',
  item_id: 'itemId',
  'item no': 'itemId',
  'item no.': 'itemId',
  itemno: 'itemId',
  'item number': 'itemId',
  'item #': 'itemId',
  part: 'itemId',
  'part id': 'itemId',
  partid: 'itemId',
  'part no': 'itemId',
  'part no.': 'itemId',
  partno: 'itemId',
  'part number': 'itemId',
  part_num: 'itemId',
  'design id': 'itemId',
  designid: 'itemId',
  color: 'color',
  colorid: 'color',
  'color id': 'color',
  color_id: 'color',
  colour: 'color',
  'colour id': 'color',
  colourid: 'color',
  qty: 'quantity',
  quantity: 'quantity',
  minqty: 'quantity',
  'min qty': 'quantity',
  min_qty: 'quantity',
  qnty: 'quantity',
  'min quantity': 'quantity',
  name: 'name',
  'item name': 'name',
  itemname: 'name',
  description: 'name',
}

function normalizeItemType(raw: string | undefined): string {
  if (!raw?.trim()) return 'PART'
  const key = raw.trim().toUpperCase().replace(/\s+/g, '_')
  return ITEM_TYPES[key] ?? key
}

function decodeXml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&')
}

function tagText(block: string, name: string): string | undefined {
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, 'i')
  const match = re.exec(block)
  if (!match?.[1]) return undefined
  const value = decodeXml(match[1].trim())
  return value === '' ? undefined : value
}

function firstTag(block: string, names: string[]): string | undefined {
  for (const name of names) {
    const value = tagText(block, name)
    if (value !== undefined) return value
  }
  return undefined
}

function readColor(colorRaw: unknown): {
  colorId: number | null
  colorText?: string
} {
  const colorText = String(colorRaw ?? '').trim()
  if (!colorText) return { colorId: null }
  if (!/^\d+$/.test(colorText)) return { colorId: null, colorText }
  return { colorId: Number(colorText) }
}

function pushItem(
  items: BrickLinkItem[],
  errors: ParseRowError[],
  row: number,
  itemTypeRaw: string | undefined,
  itemIdRaw: unknown,
  colorRaw: unknown,
  qtyRaw: unknown,
  nameRaw?: unknown,
): void {
  const itemId = String(itemIdRaw ?? '').trim()
  if (!itemId) {
    errors.push({ row, message: 'Missing BrickLink item ID' })
    return
  }

  const itemType = normalizeItemType(itemTypeRaw)
  const quantity = parseQuantity(qtyRaw, row, errors)
  if (quantity === null) return

  const { colorId, colorText } = readColor(colorRaw)
  const name = String(nameRaw ?? '').trim()
  items.push({
    itemType,
    itemId,
    colorId,
    colorText,
    quantity,
    name: name || undefined,
    row,
  })
}

export function parseBrickLinkXml(text: string): ParseResult<BrickLinkItem[]> {
  const errors: ParseRowError[] = []
  const items: BrickLinkItem[] = []
  const blocks = text.matchAll(/<ITEM\b[^>]*>([\s\S]*?)<\/ITEM>/gi)
  let index = 0
  for (const match of blocks) {
    index += 1
    const block = match[1] ?? ''
    pushItem(
      items,
      errors,
      index,
      firstTag(block, ['ITEMTYPE', 'ITEMTYPEID']),
      firstTag(block, ['ITEMID']),
      firstTag(block, ['COLOR', 'COLORID']),
      firstTag(block, ['MINQTY', 'QTY']),
      firstTag(block, ['ITEMNAME', 'DESCRIPTION']),
    )
  }

  if (items.length === 0 && errors.length === 0) {
    errors.push({ row: 0, message: 'No BrickLink ITEM entries found' })
  }

  return { data: items, errors, warnings: [] }
}

function headerRoles(cells: string[]): Set<string> {
  const roles = new Set<string>()
  for (const cell of cells) {
    const key = cell.trim().toLowerCase().replace(/\s+/g, ' ')
    const role = HEADER_ALIASES[key]
    if (role) roles.add(role)
  }
  return roles
}

function isHeaderRow(cells: string[]): boolean {
  const roles = headerRoles(cells)
  return roles.has('itemId') && roles.has('color') && roles.has('quantity')
}

type HeaderlessLayout = 'typed' | 'plain'

function headerlessLayout(cells: string[]): HeaderlessLayout | null {
  const type = cells[0]?.trim().toUpperCase() ?? ''
  if (
    cells.length >= 4 &&
    type in ITEM_TYPES &&
    cells[1]?.trim() &&
    /^\d+$/.test(cells[2]?.trim() ?? '') &&
    /^\d+$/.test(cells[3]?.trim() ?? '')
  ) {
    return 'typed'
  }
  if (
    cells.length >= 3 &&
    cells[0]?.trim() &&
    /^\d+$/.test(cells[1]?.trim() ?? '') &&
    /^\d+$/.test(cells[2]?.trim() ?? '') &&
    !(type in ITEM_TYPES)
  ) {
    return 'plain'
  }
  return null
}

function firstRecord(text: string): string[] | null {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    preview: 1,
    skipEmptyLines: 'greedy',
  })
  const row = parsed.data[0]
  if (!row || row.every((cell) => String(cell ?? '').trim() === '')) return null
  return row.map((cell) => String(cell ?? '').trim())
}

export function isBrickLinkXml(fileName: string, text: string): boolean {
  const lower = fileName.toLowerCase()
  if (lower.endsWith('.xml') || lower.endsWith('.bsx')) return true
  const head = text.trimStart().slice(0, 500).toLowerCase()
  return (
    head.startsWith('<?xml') ||
    head.startsWith('<inventory') ||
    head.startsWith('<brickstorexml')
  )
}

export function isBrickLinkDelimited(text: string): boolean {
  const cells = firstRecord(text)
  if (!cells) return false
  if (isHeaderRow(cells)) return true
  return headerlessLayout(cells) !== null
}

function columnMap(fields: string[]): Record<string, string | undefined> {
  const map: Record<string, string | undefined> = {}
  for (const field of fields) {
    const key = field.trim().toLowerCase().replace(/\s+/g, ' ')
    const role = HEADER_ALIASES[key]
    if (role && !map[role]) map[role] = field
  }
  return map
}

function parseWithHeaders(text: string): ParseResult<BrickLinkItem[]> {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  })
  const errors: ParseRowError[] = []
  if (parsed.errors.length && parsed.data.length === 0) {
    return {
      data: [],
      errors: parsed.errors.map((error) => ({
        row: error.row ?? 0,
        message: error.message,
      })),
      warnings: [],
    }
  }

  const columns = columnMap(parsed.meta.fields ?? [])
  if (!columns.itemId || !columns.color || !columns.quantity) {
    return {
      data: [],
      errors: [
        {
          row: 0,
          message:
            'BrickLink CSV must include item, color ID, and quantity columns',
        },
      ],
      warnings: [],
    }
  }

  const items: BrickLinkItem[] = []
  parsed.data.forEach((row, index) => {
    pushItem(
      items,
      errors,
      index + 2,
      columns.itemType ? String(row[columns.itemType] ?? '') : undefined,
      row[columns.itemId ?? ''],
      row[columns.color ?? ''],
      row[columns.quantity ?? ''],
      columns.name ? row[columns.name] : undefined,
    )
  })

  if (items.length === 0 && errors.length === 0) {
    errors.push({ row: 0, message: 'No BrickLink items found' })
  }
  return { data: items, errors, warnings: [] }
}

function parseHeaderless(
  text: string,
  layout: HeaderlessLayout,
): ParseResult<BrickLinkItem[]> {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: 'greedy',
  })
  const errors: ParseRowError[] = []
  const items: BrickLinkItem[] = []
  parsed.data.forEach((row, index) => {
    const cells = row.map((cell) => String(cell ?? '').trim())
    if (cells.every((cell) => cell === '')) return
    if (layout === 'typed') {
      pushItem(items, errors, index + 1, cells[0], cells[1], cells[2], cells[3])
      return
    }
    pushItem(items, errors, index + 1, undefined, cells[0], cells[1], cells[2])
  })

  if (items.length === 0 && errors.length === 0) {
    errors.push({ row: 0, message: 'No BrickLink items found' })
  }
  return { data: items, errors, warnings: [] }
}

export function parseBrickLinkDelimited(
  text: string,
): ParseResult<BrickLinkItem[]> {
  const cells = firstRecord(text)
  if (!cells) {
    return {
      data: [],
      errors: [{ row: 0, message: 'File is empty' }],
      warnings: [],
    }
  }
  if (isHeaderRow(cells)) return parseWithHeaders(text)
  const layout = headerlessLayout(cells)
  if (layout) return parseHeaderless(text, layout)
  return {
    data: [],
    errors: [
      {
        row: 0,
        message:
          'BrickLink CSV must include item, color ID, and quantity columns',
      },
    ],
    warnings: [],
  }
}

export function brickLinkItemsToSetParts(
  items: BrickLinkItem[],
  catalog: RebrickableCatalog,
): ParseResult<SetPart[]> & { rejected: RejectedBrickLinkItem[] } {
  const errors: ParseRowError[] = []
  const parts: SetPart[] = []
  const rejected: RejectedBrickLinkItem[] = []
  const skipped: string[] = []
  const ambiguous: string[] = []
  let multiElement = 0

  const reject = (item: BrickLinkItem, reason: string) => {
    rejected.push({ item, reason })
  }

  for (const item of items) {
    if (item.itemType !== 'PART') {
      const reason = `${item.itemType} items are not Pick a Brick elements`
      reject(item, reason)
      skipped.push(`${item.itemType} ${item.itemId}`)
      continue
    }
    if (item.colorId === null) {
      const reason = item.colorText
        ? `Color "${item.colorText}" is not a BrickLink color ID`
        : `Missing BrickLink color ID for ${item.itemId}`
      errors.push({ row: item.row, message: reason })
      reject(item, reason)
      continue
    }

    const match = lookupElementForBrickLink(catalog, item.itemId, item.colorId)
    if (!match) {
      const reason = `No LEGO element for ${item.itemId} color ${item.colorId}`
      errors.push({
        row: item.row,
        message: reason,
      })
      reject(item, reason)
      continue
    }
    if (match.colorAmbiguous) {
      ambiguous.push(
        `${item.itemId} color ${item.colorId} → ${match.elementId}`,
      )
    } else if (match.alternatives.length > 0) {
      multiElement += 1
    }

    parts.push({
      elementId: match.elementId,
      requiredQty: item.quantity,
      name: catalog.partNames.get(item.itemId) ?? item.name,
    })
  }

  const warnings: string[] = []
  const count = (n: number, noun: string) =>
    `${n} ${noun}${n === 1 ? '' : 's'}`
  if (skipped.length > 0) {
    const sample = skipped.slice(0, 5).join(', ')
    const extra = skipped.length > 5 ? `, +${skipped.length - 5} more` : ''
    warnings.push(`Skipped ${count(skipped.length, 'non-part item')}: ${sample}${extra}`)
  }
  if (ambiguous.length > 0) {
    const sample = ambiguous.slice(0, 4).join('; ')
    warnings.push(
      `${count(ambiguous.length, 'item')} ${ambiguous.length === 1 ? 'uses' : 'use'} a BrickLink color that covers more than one LEGO color. Picked one element ID (${sample}).`,
    )
  }
  if (multiElement > 0) {
    warnings.push(
      `${count(multiElement, 'item')} ${multiElement === 1 ? 'matches' : 'match'} more than one LEGO element ID. Used the classic element ID when one exists.`,
    )
  }

  const merged = mergeParts(parts)
  if (merged.length < parts.length) {
    warnings.push(
      `Merged ${parts.length - merged.length} duplicate element row(s)`,
    )
  }

  if (merged.length === 0 && errors.length === 0) {
    errors.push({ row: 0, message: 'No BrickLink parts matched a LEGO element ID' })
  }

  return { data: merged, errors, warnings, rejected }
}
