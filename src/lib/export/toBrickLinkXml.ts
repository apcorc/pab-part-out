import type { BrickLinkMapping, DiffRow } from '@/domain/types'
import { remainingParts } from '@/domain/diff'

export function toBrickLinkXml(
  rows: DiffRow[],
  mappings: BrickLinkMapping[],
): { xml: string; missing: string[] } {
  const map = new Map(mappings.map((m) => [m.elementId, m]))
  const remaining = remainingParts(rows)
  const missing: string[] = []
  const items: string[] = []

  for (const part of remaining) {
    const mapping = map.get(part.elementId)
    if (!mapping) {
      missing.push(part.elementId)
      continue
    }
    const itemType = mapping.itemType ?? 'PART'
    items.push(
      [
        ' <ITEM>',
        `  <ITEMTYPE>${escapeXml(itemType)}</ITEMTYPE>`,
        `  <ITEMID>${escapeXml(mapping.itemId)}</ITEMID>`,
        `  <COLOR>${mapping.colorId}</COLOR>`,
        `  <MINQTY>${part.quantity}</MINQTY>`,
        ' </ITEM>',
      ].join('\n'),
    )
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<INVENTORY>\n${items.join('\n')}\n</INVENTORY>\n`
  return { xml, missing }
}

const ITEM_TYPE_CODE: Record<string, string> = {
  PART: 'P',
  MINIFIG: 'M',
  SET: 'S',
  BOOK: 'B',
  GEAR: 'G',
  CATALOG: 'C',
  INSTRUCTION: 'I',
  ORIGINAL_BOX: 'O',
  UNSORTED_LOT: 'U',
}

export interface BrickLinkXmlItem {
  itemType: string
  itemId: string
  colorId: number | null
  colorText?: string
  quantity: number
  remarks?: string
}

/** Wanted-list XML for BrickLink rows that were not imported. */
export function brickLinkItemsToXml(items: BrickLinkXmlItem[]): string {
  const blocks = items.map((item) => {
    const itemType = ITEM_TYPE_CODE[item.itemType] ?? item.itemType
    const color =
      item.colorId !== null ? String(item.colorId) : item.colorText?.trim()
    const lines = [
      ' <ITEM>',
      `  <ITEMTYPE>${escapeXml(itemType)}</ITEMTYPE>`,
      `  <ITEMID>${escapeXml(item.itemId)}</ITEMID>`,
    ]
    if (color) lines.push(`  <COLOR>${escapeXml(color)}</COLOR>`)
    lines.push(`  <MINQTY>${item.quantity}</MINQTY>`)
    if (item.remarks) lines.push(`  <REMARKS>${escapeXml(item.remarks)}</REMARKS>`)
    lines.push(' </ITEM>')
    return lines.join('\n')
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<INVENTORY>\n${blocks.join('\n')}\n</INVENTORY>\n`
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
