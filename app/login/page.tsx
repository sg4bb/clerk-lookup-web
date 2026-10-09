'use client'

import { MotionConfig, motion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BrandMark } from '@/components/brand'
import { SiteFooter } from '@/components/site-footer'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { signIn, useSession } from '@/lib/auth'
import { isConfigured } from '@/lib/supabase'

const field =
  'h-11 w-full rounded-lg border border-input bg-background px-3.5 text-[0.95rem] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary'

export default function Login() {
  const router = useRouter()
  const session = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (session.state === 'in') router.replace('/')
  }, [session.state, router])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    setSending(true)
    setError(await signIn(email.trim(), password))
    setSending(false)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-dvh flex-col">
        <div aria-hidden="true" className="ruled pointer-events-none absolute inset-x-0 top-0 h-[70vh]" />
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="grid flex-1 place-items-center px-5 py-10">
          <motion.main
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative w-full max-w-[25rem]"
          >
            <BrandMark className="size-10" />
            <h1 className="mt-6 font-display text-[2.5rem] leading-[1.05] font-medium tracking-tight">Clerk Lookup</h1>
            <p className="mt-2 text-[1.02rem] text-muted-foreground">From the news story to the case file.</p>

            <form
              onSubmit={submit}
              noValidate
              className="mt-8 space-y-4 rounded-xl border bg-card p-6 shadow-[0_24px_48px_-30px_rgba(20,26,51,0.5)]"
            >
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={show ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${field} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    className="absolute top-1 right-1 grid size-9 place-items-center rounded-md text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={sending} className="h-11 w-full rounded-lg text-[0.95rem]">
                {sending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-5 text-sm text-muted-foreground">
              {isConfigured
                ? 'Accounts are created by the administrator. Ask them if you need one.'
                : 'Sign-in isn’t available: the site is missing its Supabase settings (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY).'}
            </p>
          </motion.main>
        </div>

        <SiteFooter />
      </div>
    </MotionConfig>
  )
}
