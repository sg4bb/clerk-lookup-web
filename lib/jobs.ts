'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { isFinal, type Job } from './types'

const TABLE = 'lookup_jobs'
const BUCKET = 'incident-reports'
// Sin "result" ni "query": son grandes y la pantalla no los usa.
const COLUMNS =
  'id,created_at,finished_at,article_url,status,status_detail,live_view_url,captcha_expires_at,' +
  'article_title,extraction,case_number,document_name,confidence,related_cases,pdf_path'
const HISTORY_COLUMNS = 'id,created_at,article_url,article_title,status,status_detail,case_number,confidence'

/** Crea el pedido. El worker lo toma de la cola por su cuenta. */
export async function createJob(articleUrl: string): Promise<Job> {
  const { data, error } = await supabase()
    .from(TABLE)
    .insert({ article_url: articleUrl })
    .select(COLUMNS)
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Could not create the search')
  return data as unknown as Job
}

/** Sigue un pedido en vivo: Realtime, con una consulta periódica de respaldo. */
export function useJob(id: string | null): { job: Job | null; missing: boolean } {
  const [job, setJob] = useState<Job | null>(null)
  const [missing, setMissing] = useState(false)
  const finalRef = useRef(false)

  useEffect(() => {
    setJob(null)
    setMissing(false)
    finalRef.current = false
    if (!id) return

    const sb = supabase()
    let alive = true
    const accept = (next: Job) => {
      finalRef.current = isFinal(next.status)
      setJob(next)
    }
    const load = async () => {
      const { data, error } = await sb.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle()
      if (!alive || error) return
      if (data) accept(data as unknown as Job)
      else setMissing(true)
    }
    void load()

    const channel = sb
      .channel(`lookup-job-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: TABLE, filter: `id=eq.${id}` },
        (payload) => {
          if (!alive) return
          setJob((previous) => {
            const next = { ...(previous ?? {}), ...(payload.new as Partial<Job>) } as Job
            finalRef.current = isFinal(next.status)
            return next
          })
        },
      )
      .subscribe()

    // Respaldo por si Realtime se cae o un aviso se pierde.
    const timer = window.setInterval(() => {
      if (!finalRef.current) void load()
    }, 4000)

    return () => {
      alive = false
      window.clearInterval(timer)
      void sb.removeChannel(channel)
    }
  }, [id])

  return { job, missing }
}

/** Últimas búsquedas del usuario. Cambia `refreshKey` para volver a cargarlas. */
export function useHistory(refreshKey: string, enabled: boolean): { jobs: Job[]; loading: boolean } {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) return
    let alive = true
    supabase()
      .from(TABLE)
      .select(HISTORY_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (!alive) return
        if (data) setJobs(data as unknown as Job[])
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [refreshKey, enabled])

  return { jobs, loading }
}

/** Enlace temporal (1 hora) al PDF del bucket privado. */
export async function pdfUrl(job: Job): Promise<string | null> {
  if (!job.pdf_path) return null
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUrl(job.pdf_path, 3600)
  if (error || !data) throw new Error(error?.message ?? 'Could not open the document')
  return data.signedUrl
}
