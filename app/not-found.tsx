import Link from 'next/link'
import { BrandMark } from '@/components/brand'
import { SiteFooter } from '@/components/site-footer'
import { ThemeToggle } from '@/components/theme-toggle'

// Se muestra para cualquier dirección que no exista (por ejemplo /asdasd).
// El botón lleva al inicio; si no hay sesión, el inicio ya manda al login.
export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden="true" className="ruled pointer-events-none absolute inset-x-0 top-0 h-[70vh]" />
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="grid flex-1 place-items-center px-5 py-10">
        <main className="relative w-full max-w-100">
          <BrandMark className="size-10" />
          <p className="case-number mt-6 text-sm text-muted-foreground">404</p>
          <h1 className="mt-1 font-display text-[2.5rem] leading-[1.05] font-medium tracking-tight">Page not found.</h1>
          <p className="mt-3 text-[1.02rem] text-muted-foreground">
            There’s nothing at this address. Check the link, or go back to start a new search.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-[0.95rem] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Back to Clerk Lookup
          </Link>
        </main>
      </div>

      <SiteFooter />
    </div>
  )
}