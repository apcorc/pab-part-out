import type { ParseRowError } from '@/domain/types'

const HEADER_ALIASES: Record<string, string> = {
  elementid: 'elementId',
  'element id': 'elementId',
  element_id: 'elementId',
  element: 'elementId',
  quantity: 'quantity',
  qty: 'quantity',
  qnty: 'quantity',
  amount: 'quantity',
  name: 'name',
  itemname: 'name',
  'item name': 'name',
  description: 'name',
  image: 'image',
  imageurl: 'image',
  'image url': 'image',
  img: 'image',
}

export function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/\s+/g, ' ')
  return HEADER_ALIASES[key] ?? header.trim()
}

export function normalizeHeaders(
  headers: string[],
): Record<string, string | undefined> {
  const map: Record<string, string | undefined> = {}
  for (const h of headers) {
    if (!h) continue
    const normalized = normalizeHeader(h)
    map[normalized] = h
  }
  return map
}

export function parseQuantity(
  raw: unknown,
  row: number,
  errors: ParseRowError[],
): number | null {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    errors.push({ row, message: 'Missing quantity' })
    return null
  }
  const n = Number(String(raw).trim().replace(/,/g, ''))
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    errors.push({ row, message: `Invalid quantity: ${String(raw)}` })
    return null
  }
  return n
}

export function parseElementId(
  raw: unknown,
  row: number,
  errors: ParseRowError[],
): string | null {
  const id = String(raw ?? '').trim()
  if (!id) {
    errors.push({ row, message: 'Missing elementId' })
    return null
  }
  return id
}
