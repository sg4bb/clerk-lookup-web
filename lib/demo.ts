// Modo demostración: simula al worker dentro del navegador para poder ver
// todo el recorrido sin Supabase. Los nombres y casos son inventados.

import type { Job, JobStatus } from './types'

const jobs = new Map<string, Job>()
const listeners = new Set<() => void>()
const waitingCaptcha = new Map<string, () => void>()

function emit() {
  listeners.forEach((fn) => fn())
}

export function subscribeDemo(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function demoJob(id: string): Job | null {
  return jobs.get(id) ?? null
}

export function demoHistory(): Job[] {
  return [...jobs.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

function patch(id: string, fields: Partial<Job>) {
  const job = jobs.get(id)
  if (!job) return
  jobs.set(id, { ...job, ...fields })
  emit()
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function blank(id: string, url: string, created: Date, status: JobStatus): Job {
  return {
    id,
    created_at: created.toISOString(),
    article_url: url,
    status,
    status_detail: null,
    live_view_url: null,
    captcha_expires_at: null,
    article_title: null,
    extraction: null,
    case_number: null,
    document_name: null,
    confidence: null,
    related_cases: [],
    pdf_path: null,
  }
}

async function run(id: string) {
  await wait(900)
  patch(id, { status: 'fetching', status_detail: null })
  await wait(2200)
  patch(id, {
    status: 'extracting',
    status_detail: null,
    article_title: 'Deputies: Man arrested after late-night break-in at Pine Hills storage lot',
  })
  await wait(2600)
  patch(id, {
    status: 'searching',
    status_detail: null,
    extraction: {
      people: [{ first_name: 'Daniel', last_name: 'Reyes Ortega', age: 34, role: 'arrested' }],
      incident_date: '2025-03-14',
      arrest_date: '2025-03-15',
      city: 'Orlando',
      county: 'Orange',
      state: 'FL',
      agency: "Orange County Sheriff's Office",
      charges: ['Burglary of a structure', 'Grand theft', 'Resisting an officer without violence'],
    },
  })
  await wait(2400)
  patch(id, {
    status: 'awaiting_captcha',
    status_detail: null,
    live_view_url: 'demo',
    captcha_expires_at: new Date(Date.now() + 8 * 60_000).toISOString(),
  })
  await new Promise<void>((resolve) => waitingCaptcha.set(id, resolve))
  patch(id, {
    status: 'searching',
    status_detail: null,
    live_view_url: null,
    captcha_expires_at: null,
  })
  await wait(2600)
  patch(id, { status: 'downloading', case_number: '2025-CF-003187-A-O' })
  await wait(2200)
  patch(id, {
    status: 'found',
    finished_at: new Date().toISOString(),
    document_name: 'Arrest Affidavit',
    confidence: 94,
    related_cases: ['2025-MM-002051-A-O'],
    pdf_path: `${id}/2025-CF-003187-A-O_Arrest_Affidavit.pdf`,
  })
}

export function demoCreate(url: string): Job {
  const id = `demo-${Date.now().toString(36)}`
  const job = blank(id, url, new Date(), 'pending')
  jobs.set(id, job)
  emit()
  void run(id)
  return job
}

export function demoSolveCaptcha(id: string) {
  const resolve = waitingCaptcha.get(id)
  if (!resolve) return
  waitingCaptcha.delete(id)
  resolve()
}

function seed() {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000)
  const a = blank('demo-seed-a', 'https://www.example-news.com/local/orlando-carjacking-arrest', hoursAgo(5), 'found')
  Object.assign(a, {
    article_title: 'Police: Suspect in downtown Orlando carjacking arrested after chase',
    case_number: '2025-CF-002904-A-O',
    document_name: 'Arrest Affidavit',
    confidence: 91,
    pdf_path: 'demo-seed-a/2025-CF-002904-A-O_Arrest_Affidavit.pdf',
    extraction: {
      people: [{ first_name: 'Marcus', last_name: 'Bell', age: 27 }],
      incident_date: '2025-03-02',
      county: 'Orange',
      agency: 'Orlando Police Department',
      charges: ['Carjacking', 'Fleeing and eluding'],
    },
  })
  const b = blank('demo-seed-b', 'https://www.example-news.com/local/winter-park-fraud-investigation', hoursAgo(27), 'not_found')
  Object.assign(b, {
    article_title: 'Winter Park woman accused of defrauding elderly neighbors',
    status_detail: 'No case on the portal matches the article closely enough',
    extraction: {
      people: [{ first_name: 'Elaine', last_name: 'Porter', age: 52 }],
      incident_date: '2025-02-20',
      county: 'Orange',
      agency: 'Winter Park Police Department',
      charges: ['Exploitation of an elderly person'],
    },
  })
  const c = blank('demo-seed-c', 'https://www.example-news.com/marion/ocala-shooting-arrest', hoursAgo(52), 'unsupported')
  Object.assign(c, {
    article_title: 'Ocala man arrested in connection with weekend shooting',
    status_detail: 'The article is about Ocala (Marion County, FL). That county is not covered yet (covered: Orange).',
    extraction: {
      people: [{ first_name: 'Travis', last_name: 'Cole', age: 41 }],
      incident_date: '2025-02-08',
      county: 'Marion',
      state: 'FL',
      agency: 'Ocala Police Department',
      charges: ['Aggravated battery with a firearm'],
    },
  })
  for (const job of [a, b, c]) jobs.set(job.id, job)
}

seed()
