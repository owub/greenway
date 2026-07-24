# Ekampreet Visual Archive

A public React/Vite video archive with an optional live Snapchat Public Profile
feed.

## Run locally

```bash
pnpm install
PORT=8080 pnpm --filter @workspace/api-server run dev
PORT=5173 API_ORIGIN=http://127.0.0.1:8080 pnpm --filter @workspace/greenways run dev
```

Open `http://localhost:5173`.

## Live snaps

Copy `.env.example` to `.env` and provide Snapchat Public Profile API
credentials. The server accepts either `SNAPCHAT_ACCESS_TOKEN` or the refresh
token combination shown in the example. `SNAPCHAT_PROFILE_ID` is optional; when
omitted, the API resolves the configured username through Creator Discovery.
