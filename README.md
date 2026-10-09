# Clerk Lookup (sitio web)

Pegas el enlace de una noticia, ves el avance de la búsqueda en vivo y recibes
el reporte del incidente en PDF. Este repositorio es solo la pantalla: el
trabajo lo hace el worker de `clerk-lookup`, que lee la tabla `lookup_jobs`.

    sitio (este repo)  ->  Supabase: lookup_jobs  <-  worker.py (clerk-lookup)

## Puesta en marcha

Necesitas Node 20 o más nuevo y pnpm (`npm install -g pnpm`).

1. En Supabase, corre en el SQL Editor (en este orden) `sql/001_lookup_jobs.sql`
   y `sql/002_roles.sql` del worker.
2. En Authentication > Sign In / Providers, desactiva
   "Allow new users to sign up". El sitio es privado: las cuentas las crea el
   administrador.
3. Crea el usuario base: Authentication > Users > Add user (correo y
   contraseña, con "Auto Confirm User" marcado).
4. Para hacerlo administrador: Table Editor > `profiles` > cambia `role` a
   `admin`. Los roles posibles son `user` (el que reciben todos al crearse) y
   `admin`. Nadie puede cambiar su propio rol desde la web.
5. Copia `.env.example` como `.env.local` y completa la URL y la clave
   **anon / publishable** (Project Settings > API). La clave `service_role`
   es del worker y nunca va en este proyecto.
6. `pnpm install` y `pnpm dev`. Abre http://localhost:3000 y entra con el
   usuario base. Deja `python worker.py` corriendo en la otra carpeta.

Sin el `.env.local` (o sin las variables en Vercel) el login avisa que falta
configuración y no deja entrar.

## Roles

Por ahora el rol solo se muestra (una etiqueta "Admin" junto al correo):
todos, admin incluido, ven únicamente sus propias búsquedas. La base ya
tiene `public.is_admin()` para cuando se agreguen permisos de administrador,
como la futura pantalla para crear cuentas (que se hará en el servidor, con
la clave `service_role`, nunca desde el navegador).

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
| `components/link-form.tsx` | Campo del enlace y su validación |
| `components/docket.tsx` | Avance paso a paso |
| `components/captcha-window.tsx` | Ventana flotante de verificación (540 x 700) |
| `components/case-file.tsx` | Resultado: carpeta con el PDF o el motivo por el que no se encontró |
| `components/history.tsx` | Búsquedas anteriores |
| `lib/jobs.ts` | Crear y seguir búsquedas en Supabase |
| `lib/auth.ts` | Sesión y rol |
| `app/globals.css` | Colores, tipografías y animaciones |
