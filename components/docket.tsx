'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Clock, ExternalLink, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { clock, host, personName, plainDate } from '@/lib/format'
import { STAGES, failedStage, stageIndex, useStageTimes } from '@/lib/stages'
import { isFinal, type Job, type JobStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const LABELS = [
  { todo: 'Read the article', doing: 'Reading the article', done: 'Article read' },
  { todo: 'Extract the details', doing: 'Extracting the details', done: 'Details extracted' },
  { todo: 'Search the county court portal', doing: 'Searching the county court portal', done: 'Case located' },
  { todo: 'Download the document', doing: 'Downloading the document', done: 'Document downloaded' },
]

type RowState = 'todo' | 'doing' | 'done' | 'failed'

function Marker({ state }: { state: RowState }) {
  if (state === 'done')
    return (
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 520, damping: 22 }}
        className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
      >
        <Check className="size-3" strokeWidth={3} aria-hidden="true" />
      </motion.span>
    )
  if (state === 'failed')
    return (
      <span className="grid size-5 place-items-center rounded-full bg-destructive text-white dark:text-background">
        <X className="size-3" strokeWidth={3} aria-hidden="true" />
      </span>
    )
  if (state === 'doing')
    return (
      <span className="relative grid size-5 place-items-center">
        <span className="absolute size-5 rounded-full bg-primary/25 motion-safe:animate-ping" />
        <span className="size-2.5 rounded-full bg-primary" />
      </span>
    )
  return <span className="mx-auto block size-2 rounded-full border border-input" />
}

function Facts({ job }: { job: Job }) {
  const x = job.extraction
  if (!x) return null
  const person = x.people?.[0]
  const name = personName(x)
  const rows: [string, string][] = []
  if (name) rows.push(['Person', person?.age ? `${name}, ${person.age}` : name])
  const date = plainDate(x.incident_date)
  if (date) rows.push(['Incident date', date])
  if (x.agency) rows.push(['Agency', x.agency])
  if (x.county) rows.push(['County', `${x.county} County${x.state ? `, ${x.state}` : ''}`])
  if (x.charges?.length) rows.push(['Charges', x.charges.join('; ')])
  if (!rows.length) return null
  return (
    <motion.dl
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className="overflow-hidden"
    >
      <div className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border bg-background/60 px-3.5 py-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </div>
    </motion.dl>
  )
}

// Si nadie toma el pedido en este tiempo, el worker probablemente no está corriendo.
const QUEUE_PATIENCE_MS = 45_000

function useStuckInQueue(job: Job): boolean {
  const [now, setNow] = useState(() => Date.now())
  const pending = job.status === 'pending'
  useEffect(() => {
    if (!pending) return
    const timer = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(timer)
  }, [pending])
  return pending && now - new Date(job.created_at).getTime() > QUEUE_PATIENCE_MS
}

// Cuánto puede tardar cada paso antes de avisar que va lento, y por qué suele ser.
// La verificación no está: ahí la espera depende de la persona.
const SLOW_STEP: Partial<Record<JobStatus, { afterMs: number; text: string }>> = {
  fetching: { afterMs: 60_000, text: 'The news site is slow to respond.' },
  extracting: { afterMs: 45_000, text: 'The AI models are taking longer than usual.' },
  searching: { afterMs: 150_000, text: 'The court portal is responding slowly.' },
  downloading: { afterMs: 90_000, text: 'The court portal is responding slowly.' },
}

/** Texto a mostrar si el paso actual lleva más de lo normal (cuenta desde que empezó ese paso). */
function useSlowStep(job: Job): string | null {
  const rule = SLOW_STEP[job.status]
  const [since, setSince] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setSince(Date.now())
    setNow(Date.now())
  }, [job.id, job.status])
  useEffect(() => {
    if (!rule) return
    const timer = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(timer)
  }, [rule])
  return rule && now - since > rule.afterMs ? rule.text : null
}

export function Docket({ job, onOpenCaptcha }: { job: Job; onOpenCaptcha: () => void }) {
  const times = useStageTimes(job)
  const current = stageIndex(job.status)
  const done = isFinal(job.status)
  const failedAt = done ? failedStage(job, times) : -1
  const stuck = useStuckInQueue(job)
  const slow = useSlowStep(job)

  function stateOf(i: number): RowState {
    if (done) {
      if (failedAt === -1) return 'done'
      if (i < failedAt) return 'done'
      return i === failedAt ? 'failed' : 'todo'
    }
    if (i < current) return 'done'
    return i === current ? 'doing' : 'todo'
  }

  return (
    <section aria-label="Search progress" className="rounded-xl border bg-card">
      <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl leading-snug font-medium text-balance">
            {job.article_title || (done ? host(job.article_url) : 'Search in progress')}
          </h2>
          <a
            href={job.article_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">{host(job.article_url)}</span>
            <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          </a>
        </div>
        {job.status === 'pending' && (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Queued</span>
        )}
      </header>

      <AnimatePresence initial={false}>
        {stuck && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-2.5 overflow-hidden border-b bg-muted/50 px-5 py-3 text-sm text-muted-foreground"
          >
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              The search hasn’t started yet. It begins as soon as the search service is running, so you can leave this
              page open.
            </span>
          </motion.p>
        )}
      </AnimatePresence>

      <ol className="px-5 py-2" aria-live="polite">
        {STAGES.map((stage, i) => {
          const state = stateOf(i)
          const label = LABELS[i]
          const time = times[stage]
          const waitingForPerson = i === 2 && job.status === 'awaiting_captcha'
          return (
            <li key={stage} className="relative grid grid-cols-[1.25rem_1fr] gap-x-3 py-3 sm:grid-cols-[4.25rem_1.25rem_1fr]">
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-9 bottom-[-0.75rem] left-[0.6rem] w-px sm:left-[5.6rem] transition-colors duration-500',
                    state === 'done' ? 'bg-primary/50' : 'bg-border',
                  )}
                />
              )}
              <time className="tabular hidden pt-0.5 text-right text-xs text-muted-foreground sm:block">
                {time && state !== 'todo' ? clock(time) : ''}
              </time>
              <span className="flex h-5 items-center justify-center">
                <Marker state={state} />
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-[0.95rem] leading-5',
                    state === 'todo' && 'text-muted-foreground',
                    state === 'done' && 'font-medium',
                    state === 'failed' && 'font-medium text-destructive',
                  )}
                >
                  {state === 'doing' ? (
                    <span className="shimmer font-medium">{waitingForPerson ? 'Needs your verification' : `${label.doing}…`}</span>
                  ) : state === 'done' ? (
                    label.done
                  ) : (
                    label.todo
                  )}
                </p>

                <AnimatePresence initial={false}>
                  {state === 'doing' && slow && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 overflow-hidden pt-1.5 text-sm text-muted-foreground"
                    >
                      <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span>{slow} The search keeps going on its own, so there’s no need to refresh.</span>
                    </motion.p>
                  )}
                </AnimatePresence>
                {i === 1 && state !== 'todo' && <Facts job={job} />}
                {i === 2 && state === 'done' && job.case_number && (
                  <p className="case-number mt-1 text-sm text-muted-foreground">{job.case_number}</p>
                )}
                {i === 3 && state === 'done' && job.document_name && (
                  <p className="mt-1 text-sm text-muted-foreground">{job.document_name}</p>
                )}

                <AnimatePresence initial={false}>
                  {waitingForPerson && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-primary/30 bg-primary/[0.06] px-3.5 py-3 text-sm">
                        <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          The portal needs to confirm a person is here. Tick the box in the verification window.
                        </span>
                        <button
                          type="button"
                          onClick={onOpenCaptcha}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          Show window
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
