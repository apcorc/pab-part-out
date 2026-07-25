import type {
  DiffRow,
  ElementId,
  Order,
  Project,
  ProjectStats,
  SetPart,
} from './types'

/** Sum quantities across all order lines by element ID. */
export function aggregateOrders(orders: Order[]): Map<ElementId, number> {
  const map = new Map<ElementId, number>()
  for (const order of orders) {
    for (const line of order.lines) {
      map.set(line.elementId, (map.get(line.elementId) ?? 0) + line.quantity)
    }
  }
  return map
}

/** Merge set parts by element ID (sum required qty; keep first name/image). */
export function mergeParts(parts: SetPart[]): SetPart[] {
  const map = new Map<ElementId, SetPart>()
  for (const part of parts) {
    const existing = map.get(part.elementId)
    if (existing) {
      existing.requiredQty += part.requiredQty
      if (!existing.name && part.name) existing.name = part.name
      if (!existing.imageUrl && part.imageUrl) existing.imageUrl = part.imageUrl
    } else {
      map.set(part.elementId, { ...part })
    }
  }
  return Array.from(map.values())
}

function metaFromOrders(
  orders: Order[],
  elementId: ElementId,
): { name?: string; imageUrl?: string } {
  for (const order of orders) {
    for (const line of order.lines) {
      if (line.elementId === elementId) {
        if (line.name || line.imageUrl) {
          return { name: line.name, imageUrl: line.imageUrl }
        }
      }
    }
  }
  return {}
}

function excludedSet(project: Project): Set<ElementId> {
  return new Set(project.excludedElementIds ?? [])
}

/** Compute required vs ordered vs remaining for a project. */
export function computeDiff(project: Project): DiffRow[] {
  const orderedMap = aggregateOrders(project.orders)
  const bomIds = new Set(project.parts.map((p) => p.elementId))
  const excluded = excludedSet(project)
  const rows: DiffRow[] = []

  for (const part of project.parts) {
    const isExcluded = excluded.has(part.elementId)
    const rawOrdered = orderedMap.get(part.elementId) ?? 0
    // Excluded parts do not appear as ordered / remaining / surplus.
    const ordered = isExcluded ? 0 : rawOrdered
    const remaining = isExcluded
      ? 0
      : Math.max(0, part.requiredQty - ordered)
    const surplus = isExcluded ? 0 : Math.max(0, ordered - part.requiredQty)
    const meta =
      part.name || part.imageUrl
        ? { name: part.name, imageUrl: part.imageUrl }
        : metaFromOrders(project.orders, part.elementId)

    rows.push({
      elementId: part.elementId,
      name: meta.name,
      imageUrl: meta.imageUrl,
      required: part.requiredQty,
      ordered,
      remaining,
      surplus,
      orphan: false,
      excluded: isExcluded,
    })
  }

  for (const [elementId, ordered] of orderedMap) {
    if (bomIds.has(elementId)) continue
    const meta = metaFromOrders(project.orders, elementId)
    rows.push({
      elementId,
      name: meta.name,
      imageUrl: meta.imageUrl,
      required: 0,
      ordered,
      remaining: 0,
      surplus: ordered,
      orphan: true,
      excluded: false,
    })
  }

  return rows
}

export function computeStats(project: Project): ProjectStats {
  const rows = computeDiff(project)
  const bomRows = rows.filter((r) => !r.orphan)
  const activeRows = bomRows.filter((r) => !r.excluded)
  const excludedRows = bomRows.filter((r) => r.excluded)

  const totalRequired = bomRows.reduce((sum, r) => sum + r.required, 0)
  const totalOrdered = activeRows.reduce((sum, r) => sum + r.ordered, 0)
  const totalRemaining = activeRows.reduce((sum, r) => sum + r.remaining, 0)
  const totalExcluded = excludedRows.reduce((sum, r) => sum + r.required, 0)

  // Excluded pieces count as fully covered toward completion.
  const covered =
    activeRows.reduce((sum, r) => sum + Math.min(r.ordered, r.required), 0) +
    totalExcluded

  return {
    uniqueElements: bomRows.length,
    totalRequired,
    totalOrdered,
    totalRemaining,
    totalExcluded,
    excludedElements: excludedRows.length,
    percentComplete:
      totalRequired === 0 ? 0 : Math.min(100, (covered / totalRequired) * 100),
  }
}

export function remainingParts(
  rows: DiffRow[],
): Array<{ elementId: ElementId; quantity: number }> {
  return rows
    .filter((r) => !r.orphan && !r.excluded && r.remaining > 0)
    .map((r) => ({ elementId: r.elementId, quantity: r.remaining }))
}
