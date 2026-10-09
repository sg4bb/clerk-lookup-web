'use client'

import { ago, jobTitle, OUTCOME_LABEL } from '@/lib/format'
import { isFinal, type Job } from '@/lib/types'
import { cn } from '@/lib/utils'

function Dot({ job }: { job: Job }) {
  const tone =
    job.status === 'found'
      ? 'bg-seal'
      : !isFinal(job.status)
        ? 'bg-primary motion-safe:animate-pulse'
        : job.status === 'error' || job.status === 'captcha_timeout' || job.status === 'unreadable'
          ? 'bg-destructive'
          : 'bg-input'
  return <span aria-hidden="true" className={cn('mt-[0.45rem] size-2 shrink-0 rounded-full', tone)} />
}

export function History({
  jobs,
  loading,
  activeId,
  onSelect,
}: {
  jobs: Job[]
  loading: boolean
  activeId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <section aria-labelledby="history-title">
      <h2 id="history-title" className="font-display text-xl font-medium">
        Past searches
      </h2>
      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : jobs.length === 0 ? (
        <p className="mt-3 max-w-[52ch] text-[0.95rem] text-muted-foreground">
          No searches yet. Paste a news link above and it will be listed here.
        </p>
      ) : (
        <ul className="mt-3 divide-y border-y">
          {jobs.map((job) => (
            <li key={job.id}>
              <button
                type="button"
                onClick={() => onSelect(job.id)}
                aria-current={job.id === activeId ? 'true' : undefined}
                className={cn(
                  'group flex w-full items-start gap-3 px-2 py-3 text-left transition-colors hover:bg-muted/60',
                  job.id === activeId && 'bg-muted/60',
                )}
              >
                <Dot job={job} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.95rem] font-medium">{jobTitle(job)}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                    <span>{OUTCOME_LABEL[job.status]}</span>
                    {job.case_number && <span className="case-number font-medium">{job.case_number}</span>}
                  </span>
                </span>
                <span className="shrink-0 pt-0.5 text-sm text-muted-foreground">{ago(job.created_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
