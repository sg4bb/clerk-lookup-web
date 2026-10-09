'use client'

import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Brand } from '@/components/brand'
import { CaptchaWindow } from '@/components/captcha-window'
import { CaseFile } from '@/components/case-file'
import { Docket } from '@/components/docket'
import { History } from '@/components/history'
import { LinkForm } from '@/components/link-form'
import { ThemeToggle } from '@/components/theme-toggle'
import { signOut, useSession } from '@/lib/auth'
import { createJob, useHistory, useJob } from '@/lib/jobs'
import { isFinal } from '@/lib/types'

const ACTIVE_KEY = 'cl-active-job'

export default function Home() {
  const router = useRouter()
  const session = useSession()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [captchaOpen, setCaptchaOpen] = useState(true)
  const { job, missing } = useJob(session.state === 'in' ? activeId : null)
  const running = Boolean(job && !isFinal(job.status))
  const { jobs, loading } = useHistory(`${activeId}:${job ? isFinal(job.status) : ''}`, session.state === 'in')

  useEffect(() => {
    if (session.state === 'out') router.replace('/login')
  }, [session.state, router])

  // Al recargar la página se retoma la búsqueda que estaba abierta.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ACTIVE_KEY)
      if (saved) setActiveId(saved)
    } catch {
      /* sin almacenamiento */
    }
  }, [])

  useEffect(() => {
    if (missing) select(null)
  }, [missing])

  // Cada vez que el portal pide verificación, la ventana vuelve a mostrarse.
  const awaiting = job?.status === 'awaiting_captcha'
  useEffect(() => {
    if (awaiting) setCaptchaOpen(true)
  }, [awaiting])

  function select(id: string | null) {
    setActiveId(id)
    try {
      if (id) window.localStorage.setItem(ACTIVE_KEY, id)
      else window.localStorage.removeItem(ACTIVE_KEY)
    } catch {
      /* sin almacenamiento */
    }
  }

  async function start(url: string) {
    const created = await createJob(url)
    select(created.id)
  }

  if (session.state !== 'in') return <div className="min-h-dvh" />

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-dvh">
        <div aria-hidden="true" className="ruled pointer-events-none absolute inset-x-0 top-0 h-[26rem]" />

        <header className="relative mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Brand />
          <div className="flex items-center gap-1">
            <span className="mr-2 hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <span className="max-w-56 truncate">{session.email}</span>
              {session.role === 'admin' && (
                <span className="rounded-full border border-primary/40 px-2 py-0.5 text-xs font-medium text-primary">
                  Admin
                </span>
              )}
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex h-9 items-center gap-2 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </header>

        <main className="relative mx-auto max-w-3xl px-5 pb-28">

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            className="pt-12 sm:pt-16"
          >
            <h1 className="font-display text-[2.6rem] leading-[1.04] font-medium tracking-tight text-balance sm:text-[3.5rem]">
              From the news story to the case file.
            </h1>
            <p className="mt-4 max-w-[58ch] text-[1.05rem] leading-relaxed text-muted-foreground">
              Paste the link to a news story about an arrest. The case is looked up at the Orange County, Florida, Clerk
              of Courts and you get the incident report as a PDF.
            </p>
            <div className="mt-8">
              <LinkForm busy={running} onSubmit={start} />
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {job && (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                className="mt-4 space-y-5"
              >
                <Docket job={job} onOpenCaptcha={() => setCaptchaOpen(true)} />
                {isFinal(job.status) && <CaseFile job={job} onRetry={(url) => void start(url)} />}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-14">
            <History jobs={jobs} loading={loading} activeId={activeId} onSelect={select} />
          </div>
        </main>

        <CaptchaWindow job={job} open={captchaOpen} onOpenChange={setCaptchaOpen} />
      </div>
    </MotionConfig>
  )
}
