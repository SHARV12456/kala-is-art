# 🎨 Kala Is Art — CRM Platform

A full-stack CRM application for luxury art consultation businesses.

**Stack:** React (Vite) + Node.js/Express + PostgreSQL  
**Hosting:** Vercel (frontend) + Render (backend + database)

---

## 🚀 Deployment Guide

### Architecture

```
GitHub (monorepo)
├── /frontend  → Vercel (React SPA)
└── /backend   → Render (Node.js API + PostgreSQL)
```

---

## Step 1: Push to GitHub

```bash
git add .
git commit -m "feat: production deployment config"
git push origin main
```

---

## Step 2: Deploy Backend on Render

### Option A — Blueprint (Recommended, one-click)

1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect your GitHub repo
3. Render will detect `render.yaml` and create:
   - A managed **PostgreSQL** database
   - A **Node.js web service** for the backend
4. After creation, set these env vars manually in the Render dashboard:

| Variable | Value |
|---|---|
| `FRONTEND_URL` | Your Vercel URL (set after Step 3) |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Your Gmail App Password |

All other secrets (`JWT_SECRET`, `COOKIE_SECRET`, etc.) are **auto-generated** by Render.

### Option B — Manual Setup

1. **Create PostgreSQL Database**  
   Render → New → PostgreSQL  
   - Name: `kala-is-art-db`  
   - Copy the **Internal Database URL**

2. **Create Web Service**  
   Render → New → Web Service  
   - Connect GitHub repo  
   - **Root Directory:** `backend`  
   - **Build Command:** `npm install`  
   - **Start Command:** `node server.js`  
   - **Runtime:** Node

3. **Set Environment Variables** in Render dashboard:

```
NODE_ENV=production
DATABASE_URL=<paste Internal Database URL from step 1>
PORT=5000
FRONTEND_URL=https://your-vercel-domain.vercel.app
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<generate another random 64-byte hex>
BCRYPT_ROUNDS=12
ENCRYPTION_KEY=<generate a 64-char hex string>
COOKIE_SECRET=<generate a random secret>
COOKIE_SECURE=true
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_MAX=200
REQUIRE_EMAIL_VERIFICATION=false
SEND_WELCOME_EMAIL=false
```

4. **Initialize the database schema**  
   After deployment, go to Render → your web service → **Shell** tab and run:
   ```bash
   node setup_db.js
   ```
   > ⚠️ This only works if setup_db.js is updated to use `DATABASE_URL`. Alternatively, connect to the DB via psql and run the schema manually.

5. Note your Render backend URL: `https://kala-is-art-backend.onrender.com`

---

## Step 3: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm install && npm run build`
   - **Output Directory:** `dist`

4. **Add Environment Variable:**

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://kala-is-art-backend.onrender.com/api` |

5. Click **Deploy**
6. Copy your Vercel URL (e.g. `https://kala-is-art.vercel.app`)

---

## Step 4: Link Frontend URL to Backend

Go back to **Render → Web Service → Environment** and update:

```
FRONTEND_URL=https://kala-is-art.vercel.app
```

Trigger a manual redeploy on Render so the CORS config picks up the new URL.

---

## ✅ Verification

After both are deployed:

1. Open `https://kala-is-art.vercel.app/login`
2. Login with:
   - **Email:** `admin@kalaisart.com`
   - **Password:** `Admin@123` ← **Change this immediately after first login**
3. Check `https://kala-is-art-backend.onrender.com/api/health` — should return `{ "success": true }`

---

## 🛠 Local Development

```bash
# 1. Start PostgreSQL locally (or use a cloud DB)
# 2. Install all dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Set up the database
cd ../backend
node setup_db.js

# 4. Start backend (in one terminal)
cd backend
npm run dev      # runs on http://localhost:5000

# 5. Start frontend (in another terminal)
cd frontend
npm run dev      # runs on http://localhost:3000
```

The frontend Vite proxy automatically routes `/api/*` → `http://localhost:5000` in dev.

---

## 📋 Database Schema

Key tables in PostgreSQL:

| Table | Description |
|---|---|
| `users` | Business users + super admin |
| `leads` | CRM lead records |
| `followups` | Follow-up tasks linked to leads |
| `clients` | Converted leads (active clients) |
| `plans` | Subscription plan definitions |
| `subscriptions` | User subscription records |
| `estimates` | Cost estimates / proposals |
| `expenses` | Business expense records |
| `income` | Revenue tracking |
| `documents` | Uploaded files metadata |
| `notifications` | In-app notification feed |

Full schema: [`backend/src/config/schema.sql`](backend/src/config/schema.sql)

---

## ⚠️ Important Notes

- **Free Render tier** spins down after 15 min of inactivity. First request after spin-down takes 30-60s (cold start). Upgrade to Starter plan to avoid this.
- **Free PostgreSQL** on Render expires after 90 days. Upgrade to avoid data loss in production.
- Never commit `.env` or `.env.local` files. Use the Render/Vercel dashboards for secrets.
- After first login, change the default admin password immediately.
