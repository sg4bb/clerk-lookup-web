'use client'

import { motion } from 'framer-motion'
import { CalendarClock, Check, Copy, ExternalLink, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { plainDate, plainDateTime } from '@/lib/format'
import type { JailBooking } from '@/lib/types'
import { cn } from '@/lib/utils'

/** "GROSS, TERRANCE LOVELLE" -> "Terrance Lovelle Gross". */
function personName(raw: string): string {
  const [last, given] = raw.split(',').map((part) => part.trim())
  const cap = (word: string) => word.charAt(0) + word.slice(1).toLowerCase()
  const title = (text: string) => text.split(/\s+/).filter(Boolean).map((w) => w.split('-').map(cap).join('-')).join(' ')
  return given ? `${title(given)} ${title(last)}` : title(raw)
}

/** "HOMICIDE MURDER FIRST DEGREE PREMEDITATED" -> "Homicide murder first degree premeditated". */
function sentence(charge: string): string {
  const lower = charge.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function CopyChip({ text, what }: { text: string; what: string }) {
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
      aria-label={copied ? `${what} copied` : `Copy ${what}`}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function Field({
  label,
  value,
  copy,
  hint,
  className,
}: {
  label: string
  value: string | null
  copy?: string
  hint?: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1">
        {value ? (
          <span className="flex flex-wrap items-center gap-2.5">
            <span className={cn(copy ? 'case-number text-[1.02rem]' : 'text-[0.95rem] font-medium')}>{value}</span>
            {copy && <CopyChip text={value} what={copy} />}
          </span>
        ) : (
          <span className="text-[0.95rem] text-muted-foreground">Not in the jail record</span>
        )}
        {hint && <span className="mt-1 block max-w-[38ch] text-[0.8rem] text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  )
}

/**
 * Escambia con el portal de la corte bloqueado: el arresto según el registro de la cárcel.
 * Una ficha con pestaña, como la carpeta de "encontrado" pero en papel común: hay arresto y
 * números, no documento. Debajo, cómo conseguir el arrest report.
 */
export function JailRecord({ booking, onRetry }: { booking: JailBooking; onRetry: () => void }) {
  const booked = plainDateTime(booking.booked)
  const days = booking.days_from_story
  const county = booking.source.replace(/\s+jail record$/i, '')
  const opened =
    booking.opened_from && booking.opened_to
      ? `${plainDate(booking.opened_from)} to ${plainDate(booking.opened_to)}`
      : null

  return (
    <motion.section
      aria-label="Arrest found in the county jail record"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-dashed border-input px-5 py-5"
    >
      <h2 className="font-display text-xl leading-snug font-medium">Arrest found in the county jail record</h2>
      <p className="mt-1.5 max-w-[60ch] text-[0.95rem] text-muted-foreground">
        {county}’s court portal is blocking automated searches right now, so the arrest report couldn’t be
        downloaded. The county jail record has the arrest instead.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 16, rotate: -0.8 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 190, damping: 22 }}
        className="mt-5"
      >
        {/* Pestaña con el número de booking, como la del número de caso en la carpeta. */}
        <div className="relative z-10 -mb-px inline-flex max-w-full items-baseline gap-2 rounded-t-lg border border-b-0 border-input bg-card px-3.5 pt-2 pb-1.5">
          <span className="text-sm text-muted-foreground">Booking</span>
          <span className="case-number truncate">{booking.booking_number}</span>
        </div>
        <div className="rounded-xl rounded-tl-none border border-input bg-card p-4 shadow-[0_18px_36px_-28px_rgba(20,26,51,0.55)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div>
              <p className="font-display text-[1.45rem] leading-tight font-medium">{personName(booking.name)}</p>
              {booked && <p className="mt-0.5 text-sm text-muted-foreground">Booked {booked}</p>}
            </div>
            <a
              href={booking.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              View jail record
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Field
              label="Court case"
              value={booking.court_case}
              copy="case number"
              hint={
                booking.other_cases?.length
                  ? `Same booking, other charges: ${booking.other_cases.join(', ')}.`
                  : undefined
              }
            />
            <Field
              label="Agency report"
              value={booking.report}
              copy="report number"
              hint={booking.report ? 'The number a footage request asks for.' : 'The court case number works too.'}
            />
            {booking.agency && <Field label="Agency" value={booking.agency} className="sm:col-span-2" />}
          </dl>

          {booking.charges.length > 0 && (
            <div className="mt-5 border-t border-dashed border-border pt-4">
              <p className="text-sm text-muted-foreground">Charges</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[0.95rem] marker:text-muted-foreground">
                {booking.charges.map((charge) => (
                  <li key={charge}>{sentence(charge)}</li>
                ))}
              </ul>
            </div>
          )}

          {days !== null && booking.story_date && (
            <p className="mt-5 flex gap-2.5 rounded-lg bg-muted px-3.5 py-3 text-sm">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>
                Matched by charges, not by date: booked {Math.abs(days)} {Math.abs(days) === 1 ? 'day' : 'days'}{' '}
                {days >= 0 ? 'after' : 'before'} the date in the story ({plainDate(booking.story_date)}). Check
                it’s the same arrest.
              </span>
            </p>
          )}
        </div>
      </motion.div>

      <div className="mt-6">
        <h3 className="text-[0.95rem] font-medium">To get the arrest report</h3>
        <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
          Search the court portal by hand with these details, or try again later: the portal sometimes lets the
          search through.
        </p>
        <dl className="mt-3 flex flex-wrap gap-2 text-[0.85rem]">
          <div className="rounded-full border bg-muted px-3 py-1">
            <dt className="inline text-muted-foreground">Name </dt>
            <dd className="inline font-medium">{booking.search_name}</dd>
          </div>
          {opened && (
            <div className="rounded-full border bg-muted px-3 py-1">
              <dt className="inline text-muted-foreground">Cases opened </dt>
              <dd className="inline font-medium">{opened}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={booking.portal_url}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }), 'h-9 gap-2 px-3.5')}
          >
            Open the court portal
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <Button variant="outline" className="h-9 gap-2 px-3.5" onClick={onRetry}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Search again
          </Button>
        </div>
      </div>
    </motion.section>
  )
}
