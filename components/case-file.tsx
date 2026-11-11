'use client'

import { motion } from 'framer-motion'
import { Check, Copy, ExternalLink, FileText, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { CopyChip } from '@/components/copy-chip'
import { JailRecord } from '@/components/jail-record'
import { Button, buttonVariants } from '@/components/ui/button'
import { plainDate, uniqueNames } from '@/lib/format'
import { pdfUrl } from '@/lib/jobs'
import { missingInfo } from '@/lib/missing'
import type { ClosestCase, Job, JobStatus, PersonSearched } from '@/lib/types'
import { cn } from '@/lib/utils'

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

function CopyButton({
  text,
  plain = false,
  what = 'case number',
}: {
  text: string
  plain?: boolean
  what?: string
}) {
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
  const label = copied ? `${what[0].toUpperCase()}${what.slice(1)} copied` : `Copy ${what}`
  if (plain) {
    // Fuera de la carpeta (tarjeta sin resultado): el botón normal de la web.
    return (
      <Button variant="outline" className="mt-4 h-9 gap-2 px-3.5" onClick={copy}>
        {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
        {label}
      </Button>
    )
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-manila-ink/25 px-4 text-sm font-medium text-manila-ink transition-colors hover:bg-manila-ink/[0.07]"
    >
      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {label}
    </button>
  )
}

const ORDINAL = ['first', 'second', 'third', 'fourth']

/** Los condados donde se buscó, en orden y sin repetir. */
function countiesSearched(people: PersonSearched[]): string[] {
  return [...new Set(people.map((person) => person.county).filter((c): c is string => !!c))]
}

/**
 * "Searched: Arthur Williams (5 cases checked), Timothy Colon (3 cases checked)".
 * Si se buscó en más de un condado: "Austin Moore in Flagler County (0 cases checked), ...".
 */
function Searched({ people }: { people: PersonSearched[] }) {
  const several = countiesSearched(people).length > 1
  return (
    <p className="mt-2.5 max-w-[60ch] text-sm text-muted-foreground">
      Searched:{' '}
      {people.map((person, i) => (
        <span key={`${person.name}-${person.county ?? ''}-${i}`}>
          {i > 0 && ', '}
          <span className="font-medium text-foreground">{person.name}</span>
          {several && person.county && ` in ${person.county}`} ({person.cases_checked}{' '}
          {person.cases_checked === 1 ? 'case' : 'cases'} checked)
        </span>
      ))}
    </p>
  )
}

/** El caso que más se acercó sin alcanzar el mínimo: para revisarlo a mano, no se descarga. */
function Closest({ closest }: { closest: ClosestCase }) {
  const opened = closest.filed_date ? `opened ${plainDate(closest.filed_date)}` : null
  const about = [closest.defendant, closest.case_type, opened].filter(Boolean).join(', ')
  const score = Math.min(100, Math.max(0, closest.score))
  return (
    <div className="mt-4 border-t border-dashed border-border pt-4">
      <p className="text-sm text-muted-foreground">
        {closest.wide ? 'Possible match found without date limits' : 'Closest case on the portal'}
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <span className="case-number text-[1.05rem]">{closest.case_number}</span>
        {about && <span className="text-sm text-muted-foreground">{about}</span>}
      </p>
      <div className="mt-2.5 max-w-sm">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">Match with the story</span>
          <span className="tabular font-semibold">{score}%</span>
        </div>
        {/* Gris, no el azul de "encontrado": no alcanzó el mínimo. */}
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-muted-foreground" style={{ width: `${score}%` }} />
        </div>
      </div>
      {closest.checks.length > 0 && (
        <ul className="mt-3 max-w-[60ch] list-disc space-y-1 pl-5 text-[0.95rem]">
          {closest.checks.map((check, i) => (
            <li key={i} className={check.ok ? 'marker:text-seal' : 'marker:text-destructive'}>
              <span className="sr-only">{check.ok ? 'Matches: ' : 'Doesn’t match: '}</span>
              {check.text}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 max-w-[60ch] text-sm text-muted-foreground">
        {closest.wide
          ? 'Same name and similar charges, but outside the story’s dates. Check when it was opened before using it in a request.'
          : 'Not enough to confirm it’s the same case. Check it on the portal before using it in a request.'}
      </p>
      <CopyButton text={closest.case_number} plain />
    </div>
  )
}

function Folder({ job }: { job: Job }) {
  const [opening, setOpening] = useState<'main' | 'support' | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  async function open(which: 'main' | 'support') {
    setProblem(null)
    setOpening(which)
    // La pestaña se abre ya, dentro del clic, para que el navegador no la bloquee.
    const tab = window.open('', '_blank')
    try {
      const url = await pdfUrl(which === 'main' ? job.pdf_path : (job.support_pdf_path ?? null))
      if (!url) throw new Error('sin enlace')
      if (tab) tab.location.href = url
      else window.location.href = url
    } catch {
      tab?.close()
      setProblem('Couldn’t open the document. Try again.')
    } finally {
      setOpening(null)
    }
  }

  const related = job.related_cases ?? []
  const support = job.support_pdf_path ? job.support_document_name || 'Warrant served' : null
  const people = job.people_searched ?? []
  const found = people.find((person) => person.status === 'found')
  // Posición de la persona en la nota (no en la lista: con varios condados, cada uno repite a todos).
  const via = found ? uniqueNames(people).indexOf(found.name) : -1
  // La nota nombraba más de un condado y el caso salió en otro distinto del primero.
  const counties = countiesSearched(people)
  const otherCounty = found?.county && counties.length > 1 && counties[0] !== found.county ? found.county : null

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

        {via > 0 && found && (
          <p className="mt-4 text-sm text-manila-ink/80">
            Found through the {ORDINAL[via] ?? 'next'} person named in the story:{' '}
            <span className="font-medium text-manila-ink">{found.name}</span>
          </p>
        )}

        {otherCounty && (
          <p className="mt-4 text-sm text-manila-ink/80">
            Found in <span className="font-medium text-manila-ink">{otherCounty}</span>, another county the story
            names. No match in {counties.slice(0, counties.indexOf(otherCounty)).join(' or ')}.
          </p>
        )}

        {related.length > 0 && (
          <p className="mt-4 text-sm text-manila-ink/80">
            Same arrest, separate case: <span className="case-number">{related.join(', ')}</span>
          </p>
        )}

        {job.agency_case_number && (
          <p className="mt-4 text-sm text-manila-ink/80">
            Agency report number: <span className="case-number">{job.agency_case_number}</span>
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => open('main')}
            disabled={opening !== null || !job.pdf_path}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-manila-ink px-4 text-sm font-medium text-manila transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <FileText className="size-4" aria-hidden="true" />
            {opening === 'main' ? 'Opening…' : 'Open PDF'}
          </button>
          {job.case_number && <CopyButton text={job.case_number} />}
          {job.agency_case_number && <CopyButton text={job.agency_case_number} what="report number" />}
        </div>

        {support && (
          // Segundo documento, como una hoja engrapada a la carpeta. Según el condado es la orden
          // ejecutada, la sworn complaint, el paquete de primera audiencia o el notice to appear.
          <div className="mt-6 border-t border-dashed border-manila-ink/25 pt-5">
            <p className="text-sm text-manila-ink/70">Also in the file: supporting document</p>
            <p className="mt-1 max-w-[52ch] text-[0.95rem] leading-snug font-medium">{support}</p>
            <p className="mt-1 max-w-[56ch] text-sm text-manila-ink/70">
              Another record from the same case. It may add details or the agency report number.
            </p>
            <button
              type="button"
              onClick={() => open('support')}
              disabled={opening !== null}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-manila-ink/25 px-4 text-sm font-medium text-manila-ink transition-colors hover:bg-manila-ink/[0.07] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <FileText className="size-4" aria-hidden="true" />
              {opening === 'support' ? 'Opening…' : 'Open document'}
            </button>
          </div>
        )}
        {problem && (
          <p role="alert" className="mt-3 text-sm font-medium text-[#8f241d]">
            {problem}
          </p>
        )}
      </div>
    </motion.section>
  )
}

/**
 * El worker termina el aviso de fuera de cobertura con "(covered: Baker County, …)".
 * Se separa para mostrar la lista como etiquetas: crece con cada condado nuevo.
 */
function splitCoverage(help: string): { text: string; counties: string[] } {
  const match = help.match(/^([\s\S]*?)\s*\(covered:\s*([\s\S]+?)\)\.?\s*$/i)
  if (!match) return { text: help, counties: [] }
  const counties = match[2]
    .split(',')
    .map((name) => name.trim().replace(/\s+county$/i, ''))
    .filter(Boolean)
  const text = match[1].trim()
  return { text: /[.!?]$/.test(text) ? text : `${text}.`, counties }
}

function Coverage({ counties }: { counties: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-muted-foreground">
        Counties covered <span className="font-medium text-foreground">({counties.length})</span>
      </p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {counties.map((name) => (
          <li key={name} className="rounded-full border bg-muted px-2.5 py-0.5 text-[0.8rem]">
            {name}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Los mensajes del worker pueden traer la dirección del portal (documentos que se piden al Clerk,
// St. Lucie): se muestra como enlace con el nombre del sitio.
function WithLinks({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g)
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {new URL(part).hostname}
          </a>
        ) : (
          part
        ),
      )}
    </>
  )
}

/**
 * Caso encontrado sin PDF. La misma carpeta que "found", pero en papel común y con un sello que dice
 * por qué no está el documento (on request, aún sin publicar, confidencial…). Debajo, el texto del
 * worker para ese condado y solo los botones que sirven en ese caso.
 */
function CaseOnFile({ job, onRetry }: { job: Job; onRetry: () => void }) {
  const missing = missingInfo(job)
  const stamp = missing.copy
  const filed = plainDate(missing.filed)
  const help = job.status_detail?.trim() || OUTCOME.no_document!.help
  const portal = stamp.portal ? missing.portal_url : null
  const people = job.people_searched ?? []
  const related = job.related_cases ?? []

  return (
    <motion.section
      aria-label="Case located without a downloadable document"
      initial={{ opacity: 0, y: 20, rotate: -0.8 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 190, damping: 22 }}
    >
      {/* Pestaña de la carpeta con el número de caso, como en la de "found". */}
      <div className="relative z-10 -mb-px inline-flex max-w-full items-baseline gap-2 rounded-t-lg border border-b-0 border-input bg-card px-4 pt-2.5 pb-2">
        <span className="text-sm text-muted-foreground">Case</span>
        <span className="case-number truncate text-[1.05rem]">{job.case_number}</span>
      </div>
      <div className="relative rounded-xl rounded-tl-none border border-input bg-card p-5 shadow-[0_18px_36px_-28px_rgba(20,26,51,0.55)] sm:p-6">
        {/* En el celular el sello va a la derecha de "Document"; desde sm, en la esquina como "Located". */}
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">Document</p>
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0, scale: 1.9, rotate: -4 }}
            animate={{ opacity: 0.85, scale: 1, rotate: -6 }}
            transition={{ delay: 0.35, duration: 0.22, ease: [0.3, 0, 0.2, 1] }}
            className="-mt-0.5 mr-1 shrink-0 rounded-[5px] border-2 border-current px-2 py-1 text-[0.68rem] leading-none font-bold tracking-[0.12em] whitespace-nowrap text-muted-foreground uppercase sm:absolute sm:top-6 sm:right-7 sm:mt-0 sm:mr-0 sm:border-[2.5px] sm:px-2.5 sm:text-sm sm:tracking-[0.14em]"
          >
            {stamp.stamp}
          </motion.div>
        </div>
        <p className="sr-only">Status: {stamp.stamp}.</p>
        <h2 className="mt-2.5 font-display text-[1.6rem] leading-tight font-medium sm:mt-0.5 sm:pr-48">
          {missing.document || stamp.title}
        </h2>
        {filed && <p className="mt-1 text-sm text-muted-foreground">Filed in the docket {filed}</p>}

        <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Court case</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2.5">
              <span className="case-number text-[1.02rem]">{job.case_number}</span>
              <CopyChip text={job.case_number!} what="case number" />
            </dd>
          </div>
          {job.agency_case_number && (
            <div>
              <dt className="text-sm text-muted-foreground">Agency report</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2.5">
                <span className="case-number text-[1.02rem]">{job.agency_case_number}</span>
                <CopyChip text={job.agency_case_number} what="report number" />
              </dd>
            </div>
          )}
        </dl>

        {related.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Same arrest, separate case: <span className="case-number text-foreground">{related.join(', ')}</span>
          </p>
        )}
        {people.length > 1 && <Searched people={people} />}

        <div className="mt-5 border-t border-dashed border-border pt-4">
          <h3 className="text-[0.95rem] font-medium">Why there’s no PDF</h3>
          <p className="mt-1 max-w-[62ch] text-sm text-muted-foreground">
            <WithLinks text={help} />
          </p>
          {(portal || stamp.retry) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {portal && (
                <a
                  href={portal}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(buttonVariants({ variant: 'outline' }), 'h-9 gap-2 px-3.5')}
                >
                  Open the court portal
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
              {stamp.retry && (
                <Button variant="outline" className="h-9 gap-2 px-3.5" onClick={onRetry}>
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Search again
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  )
}

export function CaseFile({ job, onRetry }: { job: Job; onRetry: (url: string) => void }) {
  if (job.status === 'found') return <Folder job={job} />
  // Escambia con el portal bloqueado: el arresto según la cárcel, en su propia ficha.
  if (job.status === 'no_document' && job.jail_booking)
    return <JailRecord booking={job.jail_booking} onRetry={() => onRetry(job.article_url)} />
  // Caso encontrado sin PDF: la carpeta con el sello del motivo.
  if (job.status === 'no_document' && job.case_number)
    return <CaseOnFile job={job} onRetry={() => onRetry(job.article_url)} />

  const outcome = OUTCOME[job.status]
  if (!outcome) return null
  // El worker escribe el motivo exacto en status_detail; si falta, se usa el texto general.
  const detail = job.status_detail?.trim() || outcome.help
  const { text: help, counties } = job.status === 'unsupported' ? splitCoverage(detail) : { text: detail, counties: [] }
  const people = job.people_searched ?? []
  // A quiénes se buscó: siempre si no hubo caso; en los demás, solo si fueron varios.
  const showSearched = people.length > 0 && (job.status === 'not_found' || people.length > 1)
  // Caso encontrado pero el portal no entrega ahora docket o documentos (caída de su lado):
  // el worker lo dice con "Try again", y vale la pena reintentar más tarde.
  const retry = outcome.retry || (job.status === 'no_document' && /try again/i.test(help))
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-dashed border-input px-5 py-5"
    >
      <h2 className="font-display text-xl leading-snug font-medium">{outcome.title}</h2>
      <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-muted-foreground">
        <WithLinks text={help} />
      </p>
      {counties.length > 0 && <Coverage counties={counties} />}
      {showSearched && <Searched people={people} />}
      {job.status === 'no_document' && job.case_number && (
        <p className="mt-3 text-sm">
          Case <span className="case-number">{job.case_number}</span>
        </p>
      )}
      {job.status === 'no_document' && job.agency_case_number && (
        // Sin PDF, el número de reporte del docket alcanza para pedir el footage.
        <p className="mt-1 text-sm">
          Agency report number <span className="case-number">{job.agency_case_number}</span>
        </p>
      )}
      {job.status === 'no_document' && (job.case_number || job.agency_case_number) && (
        // El número de caso sirve para buscarlo en el portal y pedir el documento al Clerk.
        <div className="flex flex-wrap gap-2">
          {job.case_number && <CopyButton text={job.case_number} plain />}
          {job.agency_case_number && <CopyButton text={job.agency_case_number} what="report number" plain />}
        </div>
      )}
      {job.status === 'not_found' && job.closest_case && <Closest closest={job.closest_case} />}
      {retry && (
        <Button variant="outline" className="mt-4 h-9 gap-2 px-3.5" onClick={() => onRetry(job.article_url)}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Search again
        </Button>
      )}
    </motion.section>
  )
}
