'use client'

import { motion } from 'framer-motion'
import { Check, Copy, FileText, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { pdfUrl } from '@/lib/jobs'
import type { Job, JobStatus } from '@/lib/types'

const OUTCOME: Partial<Record<JobStatus, { title: string; help: string; retry?: boolean }>> = {
  no_document: {
    title: 'The case exists, but it has no downloadable document',
    help: 'The portal lists the case without an incident report or arrest affidavit in PDF.',
  },
  not_found: {
    title: 'No case matches this story',
    help: 'The case may not be on the portal yet, or the name may be spelled differently in the court record.',
  },
  ambiguous: {
    title: 'Several cases match and none stands out',
    help: 'The story doesn’t give enough detail to tell them apart.',
  },
  unsupported: {
    title: 'This story is outside current coverage',
    help: 'The court portal for that county isn’t connected yet.',
  },
  unreadable: {
    title: 'The article couldn’t be read',
    help: 'Check that the link opens the news story in your browser.',
    retry: true,
  },
  no_suspect: {
    title: 'The story doesn’t name the person arrested',
    help: 'The court portal can only be searched by name, so a story without one can’t be matched to a case.',
  },
  unknown_location: {
    title: 'Couldn’t tell where this happened',
    help: 'The story doesn’t say which city or county the arrest was in.',
  },
  captcha_timeout: {
    title: 'The verification wasn’t completed in time',
    help: 'The portal session closed before the box was ticked.',
    retry: true,
  },
  error: { title: 'The search was interrupted', help: 'It stopped before reaching a result.', retry: true },
  cancelled: { title: 'Search cancelled', help: 'It stopped before reaching a result.', retry: true },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* sin permiso de portapapeles: el número sigue visible para copiarlo a mano */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-manila-ink/25 px-4 text-sm font-medium text-manila-ink transition-colors hover:bg-manila-ink/[0.07]"
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {copied ? 'Case number copied' : 'Copy case number'}
    </button>
  )
}

function Folder({ job }: { job: Job }) {
  const [opening, setOpening] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function open() {
    setProblem(null)
    setOpening(true)
    // La pestaña se abre ya, dentro del clic, para que el navegador no la bloquee.
    const tab = window.open('', '_blank')
    try {
      const url = await pdfUrl(job)
      if (!url) throw new Error('sin enlace')
      if (tab) tab.location.href = url
      else window.location.href = url
    } catch {
      tab?.close()
      setProblem('Couldn’t open the document. Try again.')
    } finally {
      setOpening(false)
    }
  }

  const related = job.related_cases ?? []

  return (
    <motion.section
      aria-label="Document found"
      initial={{ opacity: 0, y: 28, rotate: -1.2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 170, damping: 20 }}
      className="relative text-manila-ink"
    >
      {/* Pestaña de la carpeta: lleva el número de caso, como en un archivo real. */}
      <div className="relative z-10 -mb-px inline-flex max-w-full items-center rounded-t-lg border border-b-0 border-manila-edge bg-manila px-4 pt-2.5 pb-2">
        <span className="case-number truncate text-[1.05rem]">{job.case_number}</span>
      </div>
      <div className="relative overflow-hidden rounded-xl rounded-tl-none border border-manila-edge bg-manila p-5 shadow-[0_22px_44px_-26px_rgba(20,26,51,0.7)] sm:p-6">
        <motion.div
          aria-hidden="true"
          initial={{ opacity: 0, scale: 1.9, rotate: -4 }}
          animate={{ opacity: 0.82, scale: 1, rotate: -9 }}
          transition={{ delay: 0.45, duration: 0.22, ease: [0.3, 0, 0.2, 1] }}
          className="absolute top-5 right-5 rounded-[5px] border-[2.5px] border-stamp px-2.5 py-1 text-[0.8rem] leading-none font-bold tracking-[0.14em] text-stamp uppercase mix-blend-multiply sm:top-6 sm:right-7 sm:text-sm"
        >
          Located
        </motion.div>

        <p className="text-sm text-manila-ink/70">Document</p>
        <h2 className="mt-0.5 pr-28 font-display text-[1.7rem] leading-tight font-medium">
          {job.document_name || 'Incident report'}
        </h2>

        {typeof job.confidence === 'number' && (
          <div className="mt-5 max-w-sm">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-manila-ink/70">Match with the story</span>
              <span className="tabular font-semibold">{job.confidence}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-manila-ink/15">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, job.confidence))}%` }}
                transition={{ delay: 0.3, duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
                className="h-full rounded-full bg-manila-ink"
              />
            </div>
          </div>
        )}

        {related.length > 0 && (
          <p className="mt-4 text-sm text-manila-ink/80">
            Same arrest, separate case: <span className="case-number">{related.join(', ')}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={open}
            disabled={opening || !job.pdf_path}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-manila-ink px-4 text-sm font-medium text-manila transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <FileText className="size-4" aria-hidden="true" />
            {opening ? 'Opening…' : 'Open PDF'}
          </button>
          {job.case_number && <CopyButton text={job.case_number} />}
        </div>
        {problem && (
          <p role="alert" className="mt-3 text-sm font-medium text-[#8f241d]">
            {problem}
          </p>
        )}
      </div>
    </motion.section>
  )
}

export function CaseFile({ job, onRetry }: { job: Job; onRetry: (url: string) => void }) {
  if (job.status === 'found') return <Folder job={job} />

  const outcome = OUTCOME[job.status]
  if (!outcome) return null
  // El worker escribe el motivo exacto en status_detail; si falta, se usa el texto general.
  const help = job.status_detail?.trim() || outcome.help
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-dashed border-input px-5 py-5"
    >
      <h2 className="font-display text-xl leading-snug font-medium">{outcome.title}</h2>
      <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-muted-foreground">{help}</p>
      {job.status === 'no_document' && job.case_number && (
        <p className="mt-3 text-sm">
          Case <span className="case-number">{job.case_number}</span>
        </p>
      )}
      {outcome.retry && (
        <Button variant="outline" className="mt-4 h-9 gap-2 px-3.5" onClick={() => onRetry(job.article_url)}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Search again
        </Button>
      )}
    </motion.section>
  )
}
