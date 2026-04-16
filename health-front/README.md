# Health Front (Next.js 16) — UI + PWA

Email: superadmin@health.local
Password: SuperAdmin@123
Full name: Super Admin
Phone: +10000000000
Role: SuperAdmin
Active: true



`health-front` is the web UI for the project. It is a Next.js App Router app that:

- **Authenticates** by calling `health-back` and storing a backend-issued **JWT** in an **httpOnly cookie**
- Renders a **responsive** dashboard chrome (header + sidebar + footer)
- Supports **dark/light mode** (persisted in `localStorage`)
- Ships as a **PWA** (manifest + icons + service worker in production builds)

## Requirements

- Node.js (LTS recommended)
- `health-back` running locally (default `http://localhost:4000`)

## Quick start (local dev)

From `health-front/`:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

Create `health-front/.env.local`:

- **`HEALTH_BACKEND_URL`**: Base URL for `health-back` used by Next API routes and server components.
  - Example: `http://localhost:4000`

See `.env.example` for the template.

## Scripts

From `health-front/`:

- **`npm run dev`**: Start dev server (configured to run in **webpack mode** because PWA plugin injects webpack config)
- **`npm run build`**: Production build (webpack)
- **`npm start`**: Start production server (requires `npm run build` first)
- **`npm run lint`**: Lint

## How authentication works

### Login flow

1. The login form posts to **`POST /api/login`** (Next.js route handler).
2. That handler proxies to backend **`POST ${HEALTH_BACKEND_URL}/api/auth/login`** with `{ email, password }`.
3. On success, it stores the returned JWT in an **httpOnly cookie**:
   - Cookie name: `health_front_auth_token`
4. Server components check “authenticated” by checking that cookie exists.

### Logout flow

- **`POST /api/logout`** clears the `health_front_auth_token` cookie.

### Forgot / reset password

1. **`/forgot-password`** posts to **`POST /api/forgot-password`**, which proxies to **`health-back`** **`POST /api/auth/forgot-password`**. The UI always shows the same generic confirmation (no account enumeration).
2. Emails are sent from **`health-back`** when SMTP is configured (`EMAIL_ENABLED`, etc.). Configure **`PASSWORD_RESET_APP_URL`** on the backend so reset links point at this app’s origin (e.g. `http://localhost:3000` in dev).
3. **`/reset-password?token=...`** posts the token and new password to **`POST /api/reset-password`** → **`POST /api/auth/reset-password`**.

Resetting a password does not revoke existing JWT sessions until they expire.

## API proxy routes (frontend → backend)

To avoid exposing backend URLs to the browser and to automatically attach the JWT from the httpOnly cookie, the frontend provides proxy endpoints:

- `GET /api/me` → `health-back GET /api/me`
- `GET/POST /api/roles` → `health-back /api/roles`
- `GET/POST /api/permissions` → `health-back /api/permissions`
- `GET/PUT /api/company-settings` → `health-back /api/company-settings` (super-admin)

Implementation helpers:

- `lib/backend.ts` attaches `Authorization: Bearer <token>` (from cookie) to backend requests.

## Backend connection (smoke check)

The dashboard page fetches `GET ${HEALTH_BACKEND_URL}/health` (server-side) and displays its response.

If this shows an error, verify:

- backend is running on the expected port
- `HEALTH_BACKEND_URL` is correct

## UI architecture

### Dashboard chrome (persistent layout)

Dashboard routes are wrapped by `app/dashboard/layout.tsx`, which renders `components/layout/DashboardChrome.tsx`:

- **Header**: `components/layout/Header.tsx`
  - Theme toggle + logout
  - Mobile hamburger opens drawer sidebar
- **Sidebar**: `components/nav/Sidebar.tsx`
  - Desktop: fixed left nav
  - Mobile: drawer menu (closes when navigating)
- **Footer**: `components/layout/Footer.tsx`

The layout is designed so:

- header + footer remain visible
- only the center content scrolls

### Admin area (RBAC)

Admin pages are located under `app/dashboard/admin/*` and are restricted:

- The Admin link/tab is **not shown** unless the user can access admin.
- Server-side gating is applied in `app/dashboard/admin/layout.tsx`.
- Current implementation considers a user an admin when:
  - their role name is `admin`/`superadmin` (role-based override), or
  - they have one of the configured permission keys (fallback until permission keys are standardized).

Admin routes:

- `/dashboard/admin/staff`

Admin actions:

- Create role (via `/api/roles`)
- Create permission (via `/api/permissions`)

### Dark/light theme

- Toggle: `components/auth/ThemeToggle.tsx`
- Persists to `localStorage` key: `health_front_theme`
- Applies theme by toggling `.dark` class on `<html>`
- Root layout sets `suppressHydrationWarning` to avoid hydration warnings when the theme script sets the class before hydration.

## PWA (installable app)

### What is included

- Manifest: `app/manifest.ts` → served as `/manifest.webmanifest`
- Icons:
  - `app/icon.tsx` → `/icon.png`
  - `app/apple-icon.tsx` → `/apple-icon.png`
- Service worker generated by `next-pwa`:
  - output: `public/sw.js`

### Notes about dev vs production

- The service worker is **disabled in development** (by config), so for real PWA testing use a production build:

```bash
npm run build
npm start
```

Then open `http://localhost:3000` and inspect:

- Application → Manifest
- Application → Service Workers (`/sw.js`)

## Troubleshooting

### Login fails with “Invalid credentials”

- Ensure you are using a real backend user (stored in the DB used by `health-back`).

### Backend connection fails on dashboard

- Ensure `health-back` is running (default: `http://localhost:4000`)
- Check `HEALTH_BACKEND_URL` in `.env.local`

### Hydration warning about `<html class="dark">`

- The project intentionally sets the theme class before hydration. `app/layout.tsx` suppresses the warning using `suppressHydrationWarning`.

### PWA build error mentioning Turbopack/webpack

`next-pwa` injects webpack configuration. This project forces webpack mode:

- `npm run dev` uses `next dev --webpack`
- `npm run build` uses `next build --webpack`

