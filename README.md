# Clerk Lookup (sitio web)

Pegas el enlace de una noticia, ves el avance de la búsqueda en vivo y recibes
el reporte del incidente en PDF. Este repositorio es solo la pantalla: el
trabajo lo hace el worker de `clerk-lookup`, que lee la tabla `lookup_jobs`.

    sitio (este repo)  ->  Supabase: lookup_jobs  <-  worker.py (clerk-lookup)

## Probarlo en tu PC

Necesitas Node 20 o más nuevo y pnpm (`npm install -g pnpm`).

    pnpm install
    pnpm dev

Abre http://localhost:3000. Sin configurar nada arranca en **modo
demostración**: entras con cualquier correo y contraseña y la búsqueda es
simulada, para ver todas las pantallas.

## Conectarlo a Supabase

1. Copia `.env.example` como `.env.local` y completa los dos valores
   (Supabase > Project Settings > API). Usa la clave **anon / publishable**.
   La clave `service_role` es del worker y nunca va en este proyecto.
2. Crea tu usuario: Supabase > Authentication > Users > Add user (correo y
   contraseña, con "Auto Confirm User" marcado).
3. Recomendado: en Authentication > Sign In / Providers, desactiva
   "Allow new users to sign up". El sitio no tiene registro; las cuentas las
   creas tú.
4. Reinicia `pnpm dev`, entra con ese usuario y deja `python worker.py`
   corriendo en la otra carpeta.

La tabla, los permisos, Realtime y el bucket ya los crea
`sql/001_lookup_jobs.sql` del worker. Cada usuario ve solo sus búsquedas.

## Publicarlo en Vercel

1. Sube este proyecto a un repositorio privado de GitHub.
2. En Vercel: Add New > Project > importa el repositorio.
3. En Environment Variables agrega `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. Cada `git push` vuelve a publicar.

## Dónde está cada cosa

| Archivo | Qué hace |
| --- | --- |
| `app/page.tsx` | Pantalla principal |
| `app/login/page.tsx` | Inicio de sesión |
| `components/link-form.tsx` | Campo del enlace |
| `components/docket.tsx` | Avance paso a paso |
| `components/captcha-window.tsx` | Ventana flotante de verificación (540 x 700) |
| `components/case-file.tsx` | Carpeta con el resultado |
| `components/history.tsx` | Búsquedas anteriores |
| `lib/jobs.ts` | Crear y seguir búsquedas (Supabase o demostración) |
| `lib/auth.ts` | Sesión |
| `lib/demo.ts` | Worker simulado para el modo demostración |
| `app/globals.css` | Colores, tipografías y animaciones |
