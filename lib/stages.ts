'use client'

import { useEffect, useState } from 'react'
import type { Job, JobStatus } from './types'

/** Los cuatro pasos visibles. El CAPTCHA ocurre dentro de la búsqueda. */
export const STAGES = ['fetching', 'extracting', 'searching', 'downloading'] as const
export type Stage = (typeof STAGES)[number]

export function stageIndex(status: JobStatus): number {
  switch (status) {
    case 'pending':
      return -1
    case 'fetching':
      return 0
    case 'extracting':
      return 1
    case 'searching':
    case 'awaiting_captcha':
      return 2
    case 'downloading':
      return 3
    default:
      return 4
  }
}

// Hora a la que esta pestaña vio empezar cada paso (la tabla no guarda ese detalle).
const seen = new Map<string, Partial<Record<Stage, number>>>()

export function useStageTimes(job: Job | null): Partial<Record<Stage, number>> {
  const [, bump] = useState(0)
  const id = job?.id
  const status = job?.status

  useEffect(() => {
    if (!id || !status) return
    const index = stageIndex(status)
    if (index < 0 || index > 3) return
    const times = seen.get(id) ?? {}
    const stage = STAGES[index]
    if (!times[stage]) {
      times[stage] = Date.now()
      seen.set(id, times)
      bump((n) => n + 1)
    }
  }, [id, status])

  return (id && seen.get(id)) || {}
}

/** En qué paso se detuvo una búsqueda que no terminó con documento. */
export function failedStage(job: Job, times: Partial<Record<Stage, number>>): number {
  switch (job.status) {
    case 'unsupported':
      // Los datos sí se extrajeron; lo que no se puede es buscar en ese condado.
      return job.extraction ? 2 : 1
    case 'not_found':
    case 'ambiguous':
    case 'captcha_timeout':
      return 2
    case 'no_document':
      return 3
    case 'error':
    case 'cancelled': {
      let last = job.case_number ? 3 : job.extraction ? 2 : job.article_title ? 1 : 0
      STAGES.forEach((stage, i) => {
        if (times[stage]) last = Math.max(last, i)
      })
      return last
    }
    default:
      return -1
  }
}
