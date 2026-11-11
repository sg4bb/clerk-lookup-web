'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

/** Botón chico para copiar un número (caso, reporte) junto al número mismo. */
export function CopyChip({ text, what }: { text: string; what: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* sin permiso de portapapeles: el número sigue visible para copiarlo a mano */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${what} copied` : `Copy ${what}`}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
