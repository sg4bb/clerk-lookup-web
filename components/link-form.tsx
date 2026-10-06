'use client'

import { ClipboardPaste, Link2, Search } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function validate(value: string): string | null {
  if (!value) return 'Paste the link to the news story.'
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
    if (!url.hostname.includes('.')) throw new Error()
    return null
  } catch {
    return 'That doesn’t look like a link. It should start with https://'
  }
}

export function LinkForm({
  busy,
  onSubmit,
}: {
  busy: boolean
  onSubmit: (url: string) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const inputId = useId()
  const errorId = useId()

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const url = value.trim()
    const problem = validate(url)
    setError(problem)
    if (problem || busy || sending) return
    setSending(true)
    try {
      await onSubmit(url)
      setValue('')
    } catch {
      setError('Couldn’t start the search. Check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  async function paste() {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (text) {
        setValue(text)
        setError(null)
      }
    } catch {
      setError('The browser blocked clipboard access. Paste the link with Ctrl+V.')
    }
  }

  const working = busy || sending

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={inputId} className="sr-only">
        News story link
      </label>
      <div
        className={cn(
          'relative flex flex-col gap-2 rounded-xl border border-input bg-card p-2 shadow-[0_1px_0_rgba(20,26,51,0.04),0_12px_32px_-18px_rgba(20,26,51,0.35)] transition-colors sm:flex-row sm:items-center',
          'focus-within:border-primary',
          error && 'border-destructive focus-within:border-destructive',
          working && 'beam',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-2.5">
          <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            id={inputId}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://www.wesh.com/article/…"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (error) setError(null)
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="h-11 min-w-0 flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-muted-foreground/70"
          />
          {!value && (
            <button
              type="button"
              onClick={paste}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ClipboardPaste className="size-3.5" aria-hidden="true" />
              Paste
            </button>
          )}
        </div>
        <Button type="submit" disabled={working} className="h-11 gap-2 rounded-lg px-5 text-[0.95rem] disabled:opacity-70">
          <Search className="size-4" aria-hidden="true" />
          {working ? 'Search in progress' : 'Find document'}
        </Button>
      </div>
      <p id={errorId} role="alert" className={cn('mt-2 min-h-5 pl-1 text-sm text-destructive', !error && 'invisible')}>
        {error}
      </p>
    </form>
  )
}
