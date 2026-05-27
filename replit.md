# Greenways

A private, password + face-lock video platform. Users enter a passphrase, scan their face (sent to Discord webhook), wait for owner approval, then access the video library.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/greenways run dev` — run the frontend (uses PORT env var)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `MONGODB_URI` — MongoDB Atlas connection string
- Optional env: `DISCORD_WEBHOOK_URL` — Discord webhook for face scan + surveillance notifications
- Optional env: `SESSION_SECRET` — for session signing

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/greenways, previewPath `/`)
- API: Express 5 (artifacts/api-server, port 8080, path `/api`)
- DB: MongoDB + Mongoose (`@workspace/db`)
- Validation: Zod (`zod/v4`), Orval codegen from OpenAPI spec
- Security: helmet, express-rate-limit
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth OpenAPI spec
- `lib/db/src/models/` — Mongoose models (Approval, Video)
- `lib/api-zod/src/` — generated Zod validation schemas
- `lib/api-client-react/src/` — generated React Query hooks
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/greenways/src/pages/` — React pages (login, pending, videos, admin, upload, video)
- `artifacts/greenways/src/hooks/` — React hooks (use-surveillance.ts)
- `artifacts/greenways/src/index.css` — global styles + design tokens

## Architecture decisions

- Contract-first: OpenAPI → codegen → Zod schemas + React Query hooks
- MongoDB chosen over PostgreSQL for flexible face/device data storage and easy schema evolution
- Session IDs stored in `localStorage`; `sessionToken` set only after admin approval
- Admin panel at `/admin` uses a separate `adminToken` returned from admin login
- Surveillance captures every 5 min from the videos page, stored (last 20) in the Approval document
- `lib/api-zod/src/index.ts` manually re-exports types from the generated types directory, excluding `ApproveUserParams` and `DenyUserParams` which conflict with the Zod schema names — do not change this to `export * from "./generated/types"`

## Product

- Password gate: `bhendilan` (user), `navtanlol` (admin)
- Face scan on login → Discord notification → admin approves/denies at `/admin`
- Auto-session: returning users with a valid `sessionId` skip the login flow
- Video library with upload, playback, and delete
- 24/7 surveillance: camera captures every 5 min while on the videos page
- Admin panel shows face photo, IP, device info, platform, timezone, and surveillance capture count per user

## User preferences

- Dark cinematic aesthetic: deep forest-green background, gold-shimmer accents, Playfair Display serif
- Password: `bhendilan`, admin password: `navtanlol`
- No emojis in UI

## Gotchas

- `MONGODB_URI` must be set before the API server will start — it exits immediately without it
- `lib/api-zod/src/index.ts` must **not** re-export `ApproveUserParams`/`DenyUserParams` from `./generated/types` (naming conflict with Zod path-param schemas)
- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`
- Do not call `pnpm dev` at workspace root — use workflow restarts

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
