import type { Job, MissingReason } from './types'

/**
 * Caso encontrado sin PDF: qué dice el sello de la tarjeta, cómo se llama el paso en la línea de
 * tiempo y qué botones tienen sentido. El motivo lo manda el worker (missing_document, sql/007).
 */
interface ReasonCopy {
  stamp: string
  step: string
  // Título si el worker no nombra un documento (no hay affidavit, o el portal no muestra el docket).
  title: string
  portal: boolean
  retry: boolean
}

export const MISSING: Record<MissingReason, ReasonCopy> = {
  on_request: {
    stamp: 'On request',
    step: 'Document held by the clerk',
    title: 'Arrest document',
    portal: true,
    retry: false,
  },
  unpublished: {
    stamp: 'Not online yet',
    step: 'Document not online yet',
    title: 'Arrest document',
    portal: true,
    retry: true,
  },
  confidential: {
    stamp: 'Confidential',
    step: 'Document marked confidential',
    title: 'Arrest document',
    portal: true,
    retry: true,
  },
  not_in_docket: {
    stamp: 'Not in docket',
    step: 'No document to download',
    title: 'No arrest affidavit or incident report',
    portal: true,
    retry: false,
  },
  docket_unavailable: {
    stamp: 'Docket offline',
    step: 'Docket offline on the portal',
    title: 'Case docket not shown',
    portal: false,
    retry: true,
  },
  withheld: {
    stamp: 'Try later',
    step: 'Portal isn’t serving documents',
    title: 'Case documents',
    portal: false,
    retry: true,
  },
}

/** Pedidos de antes de sql/007: sin motivo guardado, se lee del texto del worker. */
const FROM_TEXT: [RegExp, MissingReason][] = [
  [/hands it over on request/i, 'on_request'],
  [/hasn't put it online yet/i, 'unpublished'],
  [/marked confidential/i, 'confidential'],
  [/Dockets are currently unavailable/i, 'docket_unavailable'],
  [/not available at this time/i, 'withheld'],
  [/docket has no incident report or arrest affidavit/i, 'not_in_docket'],
]

interface MissingInfo {
  copy: ReasonCopy
  document: string | null
  filed: string | null
  portal_url: string | null
}

export function missingInfo(job: Job): MissingInfo {
  const saved = job.missing_document
  if (saved?.reason && saved.reason in MISSING)
    return { copy: MISSING[saved.reason], document: saved.document, filed: saved.filed, portal_url: saved.portal_url }
  const text = job.status_detail ?? ''
  const reason = FROM_TEXT.find(([pattern]) => pattern.test(text))?.[1] ?? 'not_in_docket'
  return {
    copy: MISSING[reason],
    document: text.match(/\bits (.+?) (?:isn't online|is listed|is marked)/)?.[1] ?? null,
    filed: null,
    portal_url: text.match(/https?:\/\/[^\s)]+/)?.[0] ?? null,
  }
}

/** El paso 4 de la línea de tiempo cuando hay caso pero no documento. */
export function missingStep(job: Job): string {
  if (job.jail_booking) return 'Court portal blocked'
  return missingInfo(job).copy.step
}
