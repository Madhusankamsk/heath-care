### Health Backend (Node + Express + Prisma)

This service provides the RBAC, profile, and supporting APIs for the Health app.

### Running with local PostgreSQL

- **Environment**: copy `.env.example` to `.env` and set:
  - `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public` (local Postgres DSN)
  - `PORT=4000` (or your preferred port)
- **Commands**:
  - `npm install`
  - `npm run prisma:generate`
  - `npm run prisma:migrate` to apply the Prisma schema to your local Postgres.
  - `npm run dev` to start the development server.

### Auth (no Supabase)

- JWTs are now **issued and verified entirely by this backend**.
- Configure:
  - `AUTH_JWT_SECRET` – secret used to sign and verify tokens.
- Endpoints:
  - `POST /api/auth/login` – accepts `{ email }`, looks up a `Profile` by email, and returns:
    - `token` – a JWT with payload `{ sub, email, role }`.
  - Protected routes (e.g. `/api/roles`, `/api/profiles`) require:
    - `Authorization: Bearer <token>` header.

### Cloudflare R2 storage

The backend uses Cloudflare R2 (S3-compatible) for file storage.

- Configure these env vars in `.env`:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - Optional: `R2_PUBLIC_BASE_URL` (e.g. `https://cdn.example.com`) for public URLs.
- Helper module:
  - `src/services/r2Storage.ts` – exports:
    - `uploadObject({ key, contentType, body })` → returns a public or signed URL.
    - `deleteObject(key)` → deletes the object from the bucket.
- Routes:
  - `POST /api/files/upload` – protected by JWT:
    - Body: raw file bytes.
    - Headers:
      - `Authorization: Bearer <token>`
      - `x-file-key: <desired/object/key>`
      - `Content-Type: <mime-type>`
    - Response: `{ url }` – the URL to access the uploaded file.
  - `DELETE /api/files/:key` – protected by JWT:
    - Deletes the object with the given key from R2.

### Tests

- Minimal tests are provided using the Node.js built-in test runner:
  - `src/auth.test.ts` – checks JWT payload compatibility.
  - `src/r2Storage.test.ts` – asserts configuration errors when R2 is not set up.
- Run tests with:
  - `npm test`

