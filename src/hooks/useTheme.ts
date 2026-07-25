import { useEffect, useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  const resolved = useMemo(() => {
    if (theme === 'system') {
      return typeof window !== 'undefined' && getSystemDark() ? 'dark' : 'light'
    }
    return theme
  }, [theme])

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const dark =
        theme === 'dark' || (theme === 'system' && getSystemDark())
      root.classList.toggle('dark', dark)
      root.dataset.theme = dark ? 'dark' : 'light'
    }
    apply()

    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  return { theme, setTheme, resolved }
}
