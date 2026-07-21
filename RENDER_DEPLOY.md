# Production Deployment

The production service serves the terminal frontend and chat API from one
origin. MongoDB stores the shared chat history.

## Required environment

| Variable | Requirement |
|---|---|
| `MONGODB_URI` | Private MongoDB connection string |
| `SITE_PASSWORD` | Set to `bhenchod` for the requested gate |
| `SESSION_SECRET` | At least 32 random bytes |
| `NODE_ENV` | `production` |
| `PORT` | Provider-assigned service port |

Generate a session secret with:

```bash
openssl rand -base64 48
```

## Build and start

```bash
pnpm install --frozen-lockfile
pnpm run typecheck:libs
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/greenways run build
cp -r artifacts/greenways/dist/public artifacts/api-server/public
NODE_ENV=production pnpm --filter @workspace/api-server run build
node artifacts/api-server/dist/index.mjs
```

The health check is `/api/healthz`.

Use HTTPS in production, keep MongoDB private, and rotate `SESSION_SECRET` if it
is exposed. The requested shared password is intentionally known and should not
be treated as strong access control. Chat messages expire automatically after
30 days.
