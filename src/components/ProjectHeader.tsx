import type { Project } from '@/domain/types'
import { useAppStore } from '@/store/useAppStore'

interface ProjectHeaderProps {
  project: Project
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const renameProject = useAppStore((s) => s.renameProject)

  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <button
          type="button"
          className="font-display text-2xl font-bold tracking-tight hover:underline"
          onClick={() => {
            const next = window.prompt('Rename project', project.name)
            if (next !== null) renameProject(project.id, next)
          }}
          title="Click to rename"
        >
          {project.name}
        </button>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Updated {new Date(project.updatedAt).toLocaleString()}
        </p>
      </div>
    </header>
  )
}
