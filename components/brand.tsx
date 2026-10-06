export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#2f3cc0" />
      <path
        d="M7 11.5A1.5 1.5 0 0 1 8.5 10h5.2l2 2.5h7.8A1.5 1.5 0 0 1 25 14v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 7 22.5z"
        fill="#ecd690"
      />
    </svg>
  )
}

export function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className="size-7" />
      <span className="font-display text-[1.35rem] leading-none font-medium tracking-tight">Clerk Lookup</span>
    </span>
  )
}
