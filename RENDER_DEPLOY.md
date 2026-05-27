# Deploying Greenways on Render.com

This guide walks you through deploying Greenways — the private, face-lock video platform — on Render.com as a single web service.

---

## Overview

The deployment bundles both the React frontend (Vite) and the Express API into **one Render web service**. The Express server handles all `/api/*` routes and serves the built frontend for everything else.

---

## Prerequisites

- A [Render.com](https://render.com) account (free tier works)
- A [PostgreSQL database](#step-2-create-a-postgresql-database) (Render provides one)
- Your code pushed to a GitHub or GitLab repository
- Optionally: a Discord webhook URL for face-scan notifications

---

## Step 1 — Push to GitHub

Make sure your project is in a GitHub (or GitLab) repository. If it isn't already:

```bash
git init
git add .
git commit -m "initial commit"
gh repo create greenways --private --push
```

---

## Step 2 — Create a PostgreSQL Database

1. In the Render dashboard, click **New → PostgreSQL**
2. Give it a name like `greenways-db`
3. Choose the **Free** plan
4. Click **Create Database**
5. After it provisions, copy the **Internal Database URL** — you'll need it in Step 4

---

## Step 3 — Create the Web Service

### Option A — Using the `render.yaml` Blueprint (recommended)

1. In the Render dashboard, click **New → Blueprint**
2. Connect your GitHub repo
3. Render will detect `render.yaml` at the repo root and configure the service automatically
4. Continue to Step 4 to fill in environment variables

### Option B — Manual Setup

1. Click **New → Web Service**
2. Connect your GitHub repo
3. Configure as follows:

| Field | Value |
|---|---|
| **Runtime** | Node |
| **Node Version** | 20 |
| **Build Command** | `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run typecheck:libs && PORT=3000 BASE_PATH=/ pnpm --filter @workspace/greenways run build && cp -r artifacts/greenways/dist/public artifacts/api-server/public && pnpm --filter @workspace/api-server run build` |
| **Start Command** | `node --enable-source-maps artifacts/api-server/dist/index.mjs` |
| **Health Check Path** | `/api/healthz` |

---

## Step 4 — Set Environment Variables

In your web service's **Environment** tab, add these variables:

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render sets this automatically too |
| `DATABASE_URL` | `<your Internal DB URL>` | From Step 2 |
| `SITE_PASSWORD` | Your chosen site password | Users enter this to get in |
| `ADMIN_PASSWORD` | `navtanlol` | Password for the `/admin` panel |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` | Optional — for face scan notifications |

> **Important:** Use the **Internal Database URL** (not the External URL) when both services are on Render. This is faster and doesn't count against egress.

---

## Step 5 — Run Database Migrations

After the first deploy finishes, you need to push the database schema. Open a **Shell** in your Render web service dashboard and run:

```bash
pnpm --filter @workspace/db run push
```

Or run it once locally pointing at your production database:

```bash
DATABASE_URL="<your External DB URL>" pnpm --filter @workspace/db run push
```

---

## Step 6 — Deploy

Click **Deploy** (or push a new commit — Render auto-deploys on every push to your default branch).

Your site will be live at: `https://greenways.onrender.com` (or whatever name you chose)

---

## How It Works in Production

```
Browser
  │
  ▼
Render Web Service (greenways)
  ├── GET  /api/*        → Express routes (auth, videos, admin)
  ├── GET  /api/uploads/* → Uploaded video files (served as static)
  └── GET  /*            → React SPA (index.html + assets)
```

All routes go through a single Express server. The Vite-built frontend is embedded inside the server's `public/` folder at build time.

---

## Accessing the Admin Panel

Go to `https://your-app.onrender.com/admin` and enter the admin password (`navtanlol`).

From there you can:
- See all pending face scan requests with photos
- Approve users (they immediately get access)
- Deny users

---

## Uploading Videos After Deploy

Because Render's free tier uses **ephemeral disk**, uploaded videos will be lost on redeploy. To persist uploads, you have two options:

### Option A — Render Disk (Paid)
Add a Render Disk to your service in the dashboard:
- Mount path: `/opt/render/project/src/artifacts/api-server/uploads`
- Size: 1 GB or more

### Option B — S3 / Cloudflare R2 (Recommended for production)
Replace the local `multer` disk storage with an S3-compatible bucket. The code change is isolated to `artifacts/api-server/src/routes/videos.ts` — swap `multer.diskStorage` for `multer-s3`.

---

## Redeploying After Code Changes

Push to your connected branch — Render automatically rebuilds and redeploys. Zero downtime deploys are enabled by default on paid plans.

---

## Local Development (for reference)

```bash
# Install deps
pnpm install

# Push DB schema
pnpm --filter @workspace/db run push

# Start API server (port 5000 by default via workflow)
pnpm --filter @workspace/api-server run dev

# Start frontend (port auto-assigned via workflow)
pnpm --filter @workspace/greenways run dev
```

Required local env vars (create a `.env` file in `artifacts/api-server/` or set in your shell):
```
DATABASE_URL=postgresql://...
SITE_PASSWORD=bhendilan
ADMIN_PASSWORD=navtanlol
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```
