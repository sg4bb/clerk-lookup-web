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
  // Veredicto, declaración de culpa, condena o sentencia que cuenta la nota.
  court_dates?: string[] | null
  city?: string | null
  county: string | null
  state?: string | null
  agency: string | null
  charges: string[]
  summary?: string | null
}

// Una persona del artículo que el worker buscó en el portal (sql/004 del worker).
export interface PersonSearched {
  name: string
  status: JobStatus
  cases_checked: number
  // Condado donde se buscó (la nota puede nombrar varios; el worker prueba uno tras otro).
  county?: string
}

export interface CaseCheck {
  ok: boolean
  text: string
}

// El caso que más se acercó cuando ninguno alcanzó el mínimo (desde 30 %).
export interface ClosestCase {
  case_number: string
  score: number
  defendant: string | null
  case_type: string | null
  filed_date: string | null
  checks: CaseCheck[]
  // Salió de la búsqueda sin fechas (último recurso): mismo nombre y cargos parecidos.
  wide?: boolean
}

/**
 * Escambia con el portal de la corte bloqueado: el arresto según el registro de la cárcel del
 * condado (sql/006). Fechas en ISO local, sin zona: "2024-07-25T20:41", "2024-04-28".
 */
export interface JailBooking {
  source: string
  source_url: string
  name: string
  booking_number: string
  booked: string | null
  released: string | null
  court_case: string | null
  // Otros números de caso del mismo booking (cargos que no son los de la nota).
  other_cases?: string[]
  report: string | null
  agency: string | null
  charges: string[]
  // Elegido por los cargos y no por la fecha: la fecha de la nota y los días que lo separan.
  story_date: string | null
  days_from_story: number | null
  portal_url: string
  search_name: string
  opened_from: string | null
  opened_to: string | null
}

/** Por qué un caso encontrado no trae PDF (sql/007 del worker). */
export type MissingReason =
  | 'on_request'
  | 'unpublished'
  | 'confidential'
  | 'not_in_docket'
  | 'docket_unavailable'
  | 'withheld'

export interface MissingDocument {
  reason: MissingReason
  // Como lo nombra el docket ("CHARGING AFFIDAVIT"); null si no hay ninguno.
  document: string | null
  // Fecha en que entró al docket, ISO.
  filed: string | null
  portal_url: string
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
  // Documento de apoyo del mismo caso: orden ejecutada, sworn complaint, paquete de primera audiencia…
  support_document_name?: string | null
  support_pdf_path?: string | null
  people_searched?: PersonSearched[] | null
  closest_case?: ClosestCase | null
  // Número de reporte de la agencia que el portal anota en el docket (sql/005).
  agency_case_number?: string | null
  jail_booking?: JailBooking | null
  missing_document?: MissingDocument | null
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
