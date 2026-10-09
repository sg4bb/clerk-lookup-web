// Pie de página. Privacy, Terms y Help son por ahora solo visuales: cuando
// existan esas páginas, se cambian por <Link href="/privacy"> etc.
const LINKS = ['Privacy', 'Terms', 'Help']

export function SiteFooter() {
  return (
    <footer className="relative border-t">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Clerk Lookup. Document research, made clearer.</p>
        <ul className="flex gap-5">
          {LINKS.map((label) => (
            <li key={label}>
              <span className="cursor-default transition-colors hover:text-foreground">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  )
}
