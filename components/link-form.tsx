'use client'

import { ClipboardPaste, Link2, Search } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_LENGTH = 2000

/** Devuelve el enlace listo para enviar, o el mensaje que hay que mostrar. */
export function checkLink(raw: string): { url: string } | { error: string } {
  let value = raw.trim()
  if (!value) return { error: 'Paste the link to the news story.' }
  if (value.length > MAX_LENGTH) return { error: 'That link is too long. Copy it again from the address bar.' }
  if (/\s/.test(value)) return { error: 'That doesn’t look like a link. Paste the address of the news story, starting with https://' }
  // "wesh.com/article/..." sin https:// también vale.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value) && /^[\w-]+(\.[\w-]+)+(\/|$)/.test(value)) value = `https://${value}`
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { error: 'That doesn’t look like a link. Paste the address of the news story, starting with https://' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: 'Only web links (https://) can be searched.' }
  }
  if (!/^[^.]+(\.[^.]+)*\.[a-z]{2,}$/i.test(url.hostname)) {
    return { error: 'That doesn’t look like a website address. Check the link.' }
  }
  if (url.pathname.replace(/\/+$/, '') === '' && !url.search) {
    return { error: 'That’s the site’s home page. Open the news story and copy its link.' }
  }
  return { url: url.toString() }
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
    const checked = checkLink(value)
    if ('error' in checked) {
      setError(checked.error)
      return
    }
    setError(null)
    if (busy || sending) return
    setSending(true)
    try {
      await onSubmit(checked.url)
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
