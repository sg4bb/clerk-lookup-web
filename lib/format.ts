import type { Extraction, Job, JobStatus } from './types'

export function personName(extraction: Extraction | null): string | null {
  const person = extraction?.people?.[0]
  if (!person) return null
  const name = [person.first_name, person.middle_name, person.last_name, person.suffix].filter(Boolean).join(' ')
  return name || null
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2025-03-14" -> "Mar 14, 2025" (sin pasar por zonas horarias). */
export function plainDate(value: string | null | undefined): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return value ?? null
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`
}

export function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

export function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export const OUTCOME_LABEL: Record<JobStatus, string> = {
  pending: 'Queued',
  fetching: 'In progress',
  extracting: 'In progress',
  searching: 'In progress',
  awaiting_captcha: 'Needs your verification',
  downloading: 'In progress',
  found: 'Document ready',
  no_document: 'Case without document',
  not_found: 'No match',
  ambiguous: 'Several possible cases',
  unsupported: 'Outside coverage',
  unreadable: 'Article not readable',
  no_suspect: 'No name in the story',
  unknown_location: 'Location unclear',
  captcha_timeout: 'Verification expired',
  error: 'Interrupted',
  cancelled: 'Cancelled',
}

const TITLE_MAX = 140

/**
 * Título para mostrar. Algunas páginas (los videos de Facebook) usan el texto entero de la
 * publicación como título: se quita el "37K views · 247 reactions |" del inicio y se corta
 * en una palabra. El título completo queda en `job.article_title`.
 */
export function displayTitle(title: string | null | undefined): string | null {
  const clean = title?.replace(/^\s*[\d.,]+[KM]?\s+views?\b[^|]*\|\s*/i, '').trim()
  if (!clean) return null
  if (clean.length <= TITLE_MAX) return clean
  const cut = clean.slice(0, TITLE_MAX)
  const space = cut.lastIndexOf(' ')
  return `${(space > TITLE_MAX * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:|·-]+$/, '')}…`
}

export function jobTitle(job: Job): string {
  return displayTitle(job.article_title) || host(job.article_url)
}
