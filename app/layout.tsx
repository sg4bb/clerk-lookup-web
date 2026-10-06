import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/public-sans'
import '@fontsource-variable/newsreader'
import './globals.css'

export const metadata: Metadata = {
  title: 'Clerk Lookup',
  description: 'From the news story to the case file: find the incident report behind an article.',
  robots: { index: false, follow: false },
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef0f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1226' },
  ],
}

// Aplica el tema antes de pintar, para que no haya un destello claro/oscuro.
const themeScript = `(function(){try{var t=localStorage.getItem('cl-theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})()`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
