# Health Back (Node.js + Express + Prisma) — API

`health-back` is the backend API for the project. It provides:

- **JWT auth** (backend issues and validates tokens)
- **RBAC APIs**: roles + permissions
- **Profiles APIs**
- **Cloudflare R2 file upload/delete** (S3-compatible)

It runs as an Express server (default port `4000`) and uses Prisma with PostgreSQL.

## Requirements

- Node.js (LTS recommended)
- PostgreSQL database (local or hosted)

## Quick start (local)

From `health-back/`:

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend will start on `http://localhost:4000` and expose `GET /health`.

## Environment variables

Copy `.env.example` → `.env` and configure:

### Server

- **`PORT`**: server port (default `4000`)

### Database

- **`DATABASE_URL`**: PostgreSQL DSN used by Prisma
  - Example: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`

### Auth

- **`AUTH_JWT_SECRET`**: secret used to sign and verify JWTs
  - Required for `/api/auth/login` and any protected routes

### Cloudflare R2 (optional, only needed for file routes)

- **`R2_ACCOUNT_ID`**
- **`R2_ACCESS_KEY_ID`**
- **`R2_SECRET_ACCESS_KEY`**
- **`R2_BUCKET_NAME`**
- **`R2_PUBLIC_BASE_URL`** (optional): public base URL for generated links (ex: CDN)

## Scripts

From `health-back/`:

- **`npm run dev`**: Start dev server (`ts-node-dev`)
- **`npm run build`**: TypeScript build (`tsc`)
- **`npm start`**: Run compiled output (`dist/server.js`)
- **`npm test`**: Run tests (Node.js built-in test runner)
- **`npm run prisma:generate`**: Generate Prisma client
- **`npm run prisma:migrate`**: Apply migrations to DB (`prisma migrate dev`)
- **`npm run prisma:studio`**: Prisma Studio
- **`npm run seed`**: Seed script (`prisma/seed.ts`)

## Project structure

- `src/server.ts`: server entrypoint (creates HTTP server and listens)
- `src/app.ts`: Express app setup (JSON, CORS, routes)
- `src/middleware/auth.ts`: JWT auth middleware (`requireAuth`)
- `src/routes/authRoutes.ts`: login endpoint
- `src/routes/rbacRoutes.ts`: roles/permissions/profiles routes (protected)
- `src/routes/fileRoutes.ts`: R2 upload/delete routes (protected)
- `src/services/*`: domain services (RBAC, R2 storage, etc.)
- `prisma/schema.prisma`: DB schema

## Authentication

### Login

`POST /api/auth/login`

- **Body**:
  - `email` (string)
  - `password` (string)
- **Response**:
  - `token`: JWT string
  - `user`: `{ sub, email, role }`

JWT payload shape (see `src/middleware/auth.ts`):

- `sub`: user id
- `email`: user email (optional in type, but provided on login)
- `role`: role name (optional in type, but provided when user has a role)

### Using protected endpoints

Protected routes require:

`Authorization: Bearer <token>`

If the token is missing/invalid/expired, the server returns `401`.

## API endpoints

### Health

- `GET /health` → `{ status, service, timestamp }`

### Auth

- `POST /api/auth/login`

### RBAC + Profiles (protected)

All are mounted under `/api` and protected by `requireAuth`:

#### Current user

- `GET /api/me`
  - Returns the current user plus their role-derived permission keys:
    - `{ user: { id, fullName, email, role, isActive }, permissions: string[] }`

#### Company settings (super-admin only)

- `GET /api/company-settings`
- `PUT /api/company-settings`

These are protected by `requireSuperAdmin` and back the frontend page:

- `health-front/app/dashboard/super-admin/company-setup/page.tsx`

#### Roles

- `GET /api/roles`
- `POST /api/roles`
- `GET /api/roles/:id`
- `PUT /api/roles/:id`
- `DELETE /api/roles/:id`

#### Permissions

- `GET /api/permissions`
- `POST /api/permissions`
- `POST /api/permissions/attach`
- `POST /api/permissions/detach`

#### Profiles

- `GET /api/profiles`
- `POST /api/profiles`
- `GET /api/profiles/:id`
- `PUT /api/profiles/:id`
- `POST /api/profiles/:id/deactivate`

### Files (Cloudflare R2) (protected)

Mounted under `/api/files` and protected by `requireAuth`:

#### Upload

`POST /api/files/upload`

- **Body**: raw bytes (no multipart; the route buffers the request)
- **Headers**:
  - `Authorization: Bearer <token>`
  - `x-file-key: <object/key>` (required)
  - `Content-Type: <mime-type>` (optional; defaults to `application/octet-stream`)
- **Response**: `{ url }`

#### Delete

`DELETE /api/files/:key`

- **Headers**: `Authorization: Bearer <token>`
- **Response**: `204 No Content`

## Database (Prisma)

The Prisma schema models the core domain: roles/permissions/users, teams/vehicles, patients/bookings/visits, inventory/dispensing, billing, and OPD queue.

To apply schema changes:

```bash
npm run prisma:migrate
```

## Tests

Tests live in `src/*.test.ts` and run with:

```bash
npm test
```

## Running front + back together (local)

1. Start backend:

```bash
cd health-back
npm run dev
```

2. Start frontend (in another terminal):

```bash
cd health-front
cp .env.example .env.local
npm run dev
```

Frontend calls backend at `HEALTH_BACKEND_URL` (default `http://localhost:4000`).

## Seeded accounts

The seed creates a default **Super Admin** user:

- Email: `superadmin@health.local`
- Password: `SuperAdmin@123`

## Notes

### TypeScript vs `dist/`

- Backend source code lives in `src/**/*.ts`.
- `npm run build` compiles TypeScript into `dist/` (JavaScript) for production.
- `dist/` is build output and is safe to delete; it is typically ignored by git.


