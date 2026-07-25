import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { MainPanel } from '@/components/MainPanel'
import { useTheme } from '@/hooks/useTheme'

export function AppShell() {
  useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Close sidebar overlay"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-40 h-dvh transition-transform md:static md:h-full md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 md:hidden">
          <button
            type="button"
            className="btn-icon"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setSidebarOpen((o) => !o)}
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <span className="font-display text-sm font-bold">PABPartOut</span>
        </div>
        <MainPanel />
      </div>
    </div>
  )
}
