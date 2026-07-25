import { useMemo } from 'react'
import { computeDiff, computeStats } from '@/domain/diff'
import type { Project } from '@/domain/types'

export function useProjectDiff(project: Project | null) {
  return useMemo(() => {
    if (!project) {
      return {
        rows: [],
        stats: {
          uniqueElements: 0,
          totalRequired: 0,
          totalOrdered: 0,
          totalRemaining: 0,
          percentComplete: 0,
        },
      }
    }
    return {
      rows: computeDiff(project),
      stats: computeStats(project),
    }
  }, [project])
}
