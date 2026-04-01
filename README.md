# Health Scan — Monorepo

This repo contains:

- `health-back/`: **Node.js + Express + Prisma** API (PostgreSQL), JWT auth, RBAC, Cloudflare R2 file routes.
- `health-front/`: **Next.js 16 (App Router)** web UI with responsive dashboard chrome, dark/light mode, RBAC-gated admin areas, and **PWA** support.

## Quick start (local dev)

### 1) Backend

```bash
cd health-back
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Backend: `http://localhost:4000`  
Health check: `GET /health`

### 2) Frontend

```bash
cd health-front
npm install
cp .env.example .env.local
npm run dev
```

Frontend: `http://localhost:3000`

## Default Super Admin (seed)

- **Email**: `superadmin@health.local`
- **Password**: `SuperAdmin@123`

## Notes

- **PWA**: service worker is disabled in dev. Use `npm run build` + `npm start` to test installability.
- **Windows**: if Prisma generate fails with `EPERM` (file locked), stop any running Node processes using Prisma and retry.

## Repo AI rules (Cursor)

Project rules live in `.cursor/rules/`.

