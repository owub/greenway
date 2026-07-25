# Greenway School Leaks

React/Vite video archive served by an Express API. MongoDB stores likes and
comments; Snapchat Public Profile credentials are optional.

## Requirements

- Node.js 20 or newer
- pnpm 10.32.1
- MongoDB for likes and comments

## Run locally

Install dependencies and create your local environment file:

```bash
pnpm install
cp .env.example .env
```

Start the API in one terminal:

```bash
pnpm run dev:api
```

Start the Vite frontend in a second terminal:

```bash
pnpm run dev:web
```

Open `http://localhost:5173`. The API runs on `http://localhost:8080`.

The local `.env` file is ignored by Git. Set `MONGO_URI` to your MongoDB
connection string. To enable live Snapchat data, provide either
`SNAPCHAT_ACCESS_TOKEN` or all three refresh-token values:
`SNAPCHAT_CLIENT_ID`, `SNAPCHAT_CLIENT_SECRET`, and
`SNAPCHAT_REFRESH_TOKEN`.

## Production build

The production build compiles the frontend, copies it into the API server, and
then bundles the server:

```bash
pnpm run build:render
NODE_ENV=production PORT=8080 pnpm start
```

For a local server that loads values directly from `.env`, use
`pnpm run start:local`.

## Deploy on Render

The included `render.yaml` can create the web service as a Render Blueprint.
For a manually configured Render Web Service, use:

**Build Command**

```bash
pnpm install --frozen-lockfile --prod=false && pnpm run build:render
```

**Start Command**

```bash
pnpm start
```

Set these Render environment variables:

| Variable                 | Required | Purpose                                                    |
| ------------------------ | -------- | ---------------------------------------------------------- |
| `NODE_ENV`               | Yes      | Set to `production`.                                       |
| `PORT`                   | Yes      | Render normally provides this; the Blueprint uses `10000`. |
| `MONGO_URI`              | Yes      | Production MongoDB connection string.                      |
| `MONGO_DB`               | Yes      | MongoDB database name, default `greenway`.                 |
| `SNAPCHAT_USERNAME`      | No       | Public profile username.                                   |
| `SNAPCHAT_PROFILE_ID`    | No       | Skips username lookup when provided.                       |
| `SNAPCHAT_CLIENT_ID`     | No       | Snapchat OAuth client ID.                                  |
| `SNAPCHAT_CLIENT_SECRET` | No       | Snapchat OAuth client secret.                              |
| `SNAPCHAT_REFRESH_TOKEN` | No       | Snapchat OAuth refresh token.                              |
| `SNAPCHAT_ACCESS_TOKEN`  | No       | Short-lived alternative to refresh credentials.            |

Do not commit `.env` or place secrets directly in `render.yaml`.
