# Deploying Greenways on Render.com

This guide walks you through deploying Greenways — the private, face-lock video platform — on Render.com as a single web service backed by MongoDB Atlas.

---

## Overview

The deployment bundles both the React frontend (Vite) and the Express API into **one Render web service**. The Express server handles all `/api/*` routes and serves the built frontend for everything else.

**Database:** MongoDB Atlas (free tier available)

---

## Prerequisites

- A [Render.com](https://render.com) account (free tier works)
- A [MongoDB Atlas](https://cloud.mongodb.com) account (free M0 cluster)
- Your code pushed to a GitHub or GitLab repository
- Optionally: a Discord webhook URL for face-scan notifications

---

## Step 1 — Push to GitHub

Make sure your project is in a GitHub (or GitLab) repository:

```bash
git init
git add .
git commit -m "initial commit"
gh repo create greenways --private --push
```

---

## Step 2 — Create a MongoDB Atlas Database

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and sign up / log in
2. Click **Create** → choose **M0 Free** tier
3. Choose a cloud provider & region (pick one close to your Render region)
4. Name your cluster (e.g. `greenways`)
5. Click **Create Deployment**

### Get your connection string

1. In Atlas, click **Connect** on your cluster
2. Choose **Drivers** → Node.js
3. Copy the connection string — it looks like:
   ```
   mongodb+srv://<username>:<password>@greenways.abc12.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<username>` and `<password>` with your Atlas credentials
5. Add your database name before the `?`:
   ```
   mongodb+srv://user:pass@greenways.abc12.mongodb.net/greenways?retryWrites=true&w=majority
   ```

### Allow connections from Render

In Atlas → **Network Access** → **Add IP Address** → enter `0.0.0.0/0` (allow all).  
This is required because Render uses dynamic IPs.

---

## Step 3 — Create the Web Service on Render

### Option A — Using the `render.yaml` Blueprint (recommended)

1. In the Render dashboard, click **New → Blueprint**
2. Connect your GitHub repo
3. Render detects `render.yaml` and pre-fills all settings
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
| `PORT` | `10000` | Render sets this automatically |
| `MONGODB_URI` | `mongodb+srv://...` | Your Atlas connection string from Step 2 |
| `SITE_PASSWORD` | `bhendilan` | Users enter this to access the site |
| `ADMIN_PASSWORD` | `navtanlol` | Password for the `/admin` panel |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` | Optional — face scan notifications |

---

## Step 5 — Deploy

Click **Deploy** (or push a commit). Render builds and deploys automatically.

MongoDB Atlas creates collections automatically on first use — no migration step needed.

Your site will be live at: `https://greenways.onrender.com`

---

## How It Works in Production

```
Browser
  │
  ▼
Render Web Service (greenways)
  ├── GET  /api/*          → Express routes (auth, videos, admin)
  ├── GET  /api/uploads/*  → Uploaded video files (static)
  └── GET  /*              → React SPA (index.html + assets)
         │
         ▼
    MongoDB Atlas
    ├── approvals collection  (face scan requests)
    └── videos collection     (uploaded video metadata)
```

---

## Accessing the Admin Panel

Go to `https://your-app.onrender.com/admin` and enter: **`navtanlol`**

From there you can:
- See all access requests with face photos
- **Approve** users (they immediately get a session token and access)
- **Deny** users

---

## Video Storage on Render

Render's free tier uses **ephemeral disk** — uploaded videos are lost on redeploy.

### Option A — Render Disk (Paid, simplest)
Add a Render Disk in the dashboard:
- **Mount Path:** `/opt/render/project/src/artifacts/api-server/uploads`
- **Size:** 1 GB+

### Option B — Cloudflare R2 / AWS S3 (Recommended for production)
Swap `multer` disk storage for `multer-s3`. The change is isolated to `artifacts/api-server/src/routes/videos.ts`.

---

## Redeploying After Code Changes

Push to your connected branch — Render auto-rebuilds and redeploys.

---

## Local Development

```bash
# Install dependencies
pnpm install

# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend (separate terminal)
pnpm --filter @workspace/greenways run dev
```

Create `artifacts/api-server/.env` (or export in your shell):
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/greenways
SITE_PASSWORD=bhendilan
ADMIN_PASSWORD=navtanlol
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```
