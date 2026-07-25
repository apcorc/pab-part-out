import { useEffect, useState } from 'react'
import {
  loadRebrickableCatalog,
  type RebrickableCatalog,
} from '@/lib/rebrickable/catalog'

interface CatalogHookState {
  catalog: RebrickableCatalog | null
  loading: boolean
  error: string | null
}

export function useRebrickableCatalog(): CatalogHookState {
  const [catalog, setCatalog] = useState<RebrickableCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadRebrickableCatalog()
      .then((loaded) => {
        if (cancelled) return
        setCatalog(loaded)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setCatalog(null)
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { catalog, loading, error }
}
