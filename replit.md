# root@hate

A mobile-compatible hacker-terminal site with:

- `neofetch`-style `root@hate` login
- shared password gate configured by `SITE_PASSWORD`
- unknown profile using `assets/hate.jpeg`
- persistent anonymous group chat
- signed `HttpOnly`, `SameSite=Strict` sessions
- message rate limiting and 30-day chat expiry

## Commands

- `pnpm --filter @workspace/api-server run dev`
- `pnpm --filter @workspace/greenways run dev`
- `pnpm run typecheck`
- `pnpm run build`
- `pnpm --filter @workspace/api-spec run codegen`

The API requires `MONGODB_URI`, `SITE_PASSWORD`, and `SESSION_SECRET`. See
`.env.example` for local values.

## Structure

- `lib/api-spec/openapi.yaml`: API contract
- `lib/db/src/models/message.ts`: chat storage
- `artifacts/api-server/src`: Express API
- `artifacts/greenways/src`: React terminal UI
