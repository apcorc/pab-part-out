import { FolderPlus } from 'lucide-react'
import { ExportBar } from '@/components/ExportBar'
import { ImportZone } from '@/components/ImportZone'
import { OrdersPanel } from '@/components/OrdersPanel'
import { PartsTable } from '@/components/PartsTable'
import { ProgressDashboard } from '@/components/ProgressDashboard'
import { ProjectHeader } from '@/components/ProjectHeader'
import { useProjectDiff } from '@/hooks/useProjectDiff'
import { selectActiveProject, useAppStore } from '@/store/useAppStore'

export function MainPanel() {
  const project = useAppStore(selectActiveProject)
  const createProject = useAppStore((s) => s.createProject)
  const { rows, stats } = useProjectDiff(project)

  if (!project) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="max-w-md">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            PABPartOut
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Track Pick a Brick orders against a set parts list, then export what
            you still need.
          </p>
          <button
            type="button"
            className="btn-primary mt-6"
            onClick={() => createProject('My first project')}
          >
            <FolderPlus className="h-4 w-4" aria-hidden />
            Create a project
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <ProjectHeader project={project} />
      <ProgressDashboard stats={stats} />
      <ImportZone project={project} />
      <OrdersPanel project={project} />
      <PartsTable rows={rows} />
      <ExportBar projectName={project.name} rows={rows} />
    </main>
  )
}
