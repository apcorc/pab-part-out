import { Monitor, Moon, Sun } from 'lucide-react'
import type { ThemeMode } from '@/domain/types'
import { useTheme } from '@/hooks/useTheme'

const OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
      role="group"
      aria-label="Theme"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${
              active
                ? 'bg-[var(--surface)] text-[var(--fg)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--fg)]'
            }`}
            aria-pressed={active}
            title={label}
            onClick={() => setTheme(value)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
