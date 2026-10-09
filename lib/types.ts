// Misma forma que la tabla public.lookup_jobs (sql/001_lookup_jobs.sql del worker).

export type JobStatus =
  | 'pending'
  | 'fetching'
  | 'extracting'
  | 'searching'
  | 'awaiting_captcha'
  | 'downloading'
  | 'found'
  | 'no_document'
  | 'not_found'
  | 'ambiguous'
  | 'unsupported'
  | 'unreadable'
  | 'no_suspect'
  | 'unknown_location'
  | 'captcha_timeout'
  | 'error'
  | 'cancelled'

export interface Person {
  first_name: string | null
  middle_name?: string | null
  last_name: string | null
  suffix?: string | null
  age: number | null
  role?: string | null
}

export interface Extraction {
  people: Person[]
  incident_date: string | null
  arrest_date?: string | null
  city?: string | null
  county: string | null
  state?: string | null
  agency: string | null
  charges: string[]
  summary?: string | null
}

export interface Job {
  id: string
  created_at: string
  finished_at?: string | null
  article_url: string
  status: JobStatus
  status_detail: string | null
  live_view_url: string | null
  captcha_expires_at: string | null
  article_title: string | null
  extraction: Extraction | null
  case_number: string | null
  document_name: string | null
  confidence: number | null
  related_cases: string[] | null
  pdf_path: string | null
}

export const FINAL_STATUSES: JobStatus[] = [
  'found',
  'no_document',
  'not_found',
  'ambiguous',
  'unsupported',
  'unreadable',
  'no_suspect',
  'unknown_location',
  'captcha_timeout',
  'error',
  'cancelled',
]

export function isFinal(status: JobStatus): boolean {
  return FINAL_STATUSES.includes(status)
}
