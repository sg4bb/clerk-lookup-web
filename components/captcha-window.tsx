'use client'

import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { GripHorizontal, Minus, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { demoSolveCaptcha } from '@/lib/demo'
import type { Job } from '@/lib/types'

// El worker deja la casilla centrada en un navegador remoto de este tamaño exacto.
const VIEW_W = 540
const VIEW_H = 700
const CHROME_H = 96 // cabecera + pie de la ventana

function useCountdown(expiresAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!expiresAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt])
  if (!expiresAt) return null
  const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000))
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
}

function useScale(): number {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () =>
      setScale(Math.min(1, (window.innerHeight - CHROME_H - 32) / VIEW_H, (window.innerWidth - 24) / VIEW_W))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return Math.max(0.45, scale)
}

export function CaptchaWindow({
  job,
  open,
  onOpenChange,
}: {
  job: Job | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const active = Boolean(job && job.status === 'awaiting_captcha' && job.live_view_url)
  const countdown = useCountdown(active ? (job?.captcha_expires_at ?? null) : null)
  const scale = useScale()
  const controls = useDragControls()
  const bounds = useRef<HTMLDivElement>(null)
  const isDemoView = job?.live_view_url === 'demo'

  return (
    <div ref={bounds} className="pointer-events-none fixed inset-0 z-50 flex items-end justify-end p-3 sm:p-5">
      <AnimatePresence>
        {active && open && (
          <motion.div
            key="window"
            role="dialog"
            aria-label="Portal verification"
            drag
            dragListener={false}
            dragControls={controls}
            dragConstraints={bounds}
            dragMomentum={false}
            dragElastic={0.06}
            initial={{ opacity: 0, y: 48, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            style={{ width: VIEW_W * scale }}
            className="pointer-events-auto overflow-hidden rounded-xl border border-input bg-card shadow-[0_30px_70px_-20px_rgba(8,10,28,0.65)]"
          >
            <div
              onPointerDown={(event) => controls.start(event)}
              className="flex h-12 cursor-grab touch-none items-center gap-2.5 border-b px-3.5 select-none active:cursor-grabbing"
            >
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium">Verification</span>
              <GripHorizontal className="size-4 text-muted-foreground/60" aria-hidden="true" />
              <span className="ml-auto text-sm text-muted-foreground">
                <span className="tabular font-medium text-foreground">{countdown}</span> left
              </span>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onOpenChange(false)}
                aria-label="Minimize the verification window"
                className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Minus className="size-4" />
              </button>
            </div>

            <div style={{ height: VIEW_H * scale }} className="relative overflow-hidden bg-white">
              {isDemoView ? (
                <div className="flex h-full flex-col items-center justify-center gap-5 px-8 text-center text-[#141a33]">
                  <p className="max-w-[30ch] text-sm text-[#565d78]">
                    The portal’s “I&apos;m not a robot” box appears here, live from the remote browser.
                  </p>
                  <button
                    type="button"
                    onClick={() => job && demoSolveCaptcha(job.id)}
                    className="flex items-center gap-3 rounded-[3px] border border-[#d3d3d3] bg-[#f9f9f9] py-4 pr-10 pl-4 text-sm shadow-sm hover:bg-white"
                  >
                    <span className="size-6 rounded-[2px] border-2 border-[#c1c1c1] bg-white" />
                    Simulate the verification
                  </button>
                </div>
              ) : (
                <iframe
                  title="Portal verification box"
                  src={job?.live_view_url ?? undefined}
                  sandbox="allow-same-origin allow-scripts"
                  allow="clipboard-read; clipboard-write"
                  style={{
                    width: VIEW_W,
                    height: VIEW_H,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                  className="block border-0"
                />
              )}
            </div>

            <p className="flex h-12 items-center border-t px-3.5 text-sm text-muted-foreground">
              Tick the box. The search continues by itself once the portal accepts it.
            </p>
          </motion.div>
        )}

        {active && !open && (
          <motion.button
            key="pill"
            type="button"
            onClick={() => onOpenChange(true)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex h-11 items-center gap-2.5 rounded-full bg-primary pr-4 pl-3.5 text-sm font-medium text-primary-foreground shadow-[0_14px_30px_-12px_rgba(47,60,192,0.8)]"
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            Needs your verification
            <span className="tabular opacity-80">{countdown}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
