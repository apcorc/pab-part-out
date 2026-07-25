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

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
