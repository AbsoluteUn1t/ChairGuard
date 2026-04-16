# ChairGuard

**No-Show Protection for Salons** — A micro-SaaS that helps salons eliminate revenue loss from no-shows through automated confirmations, waitlist backfill, and client no-show scoring.

## The Problem
- **30-50% no-show rate** across salons
- **$80-200/hr** lost per empty chair
- **$93K-$187K/year** estimated loss for a 5-chair salon

## The Solution
ChairGuard sends automated reminders, fills empty slots via waitlist, and scores clients to identify chronic no-show offenders.

## Quick Start

### 1. Install Dependencies
```bash
cd chairguard
npm install
```

### 2. Set Up Environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Initialize Database
```bash
npm run db:migrate
```

### 4. Start Server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The API will be available at `http://localhost:3000`

### 5. Open Landing Page
Visit `http://localhost:3000` to see the landing page with the no-show calculator.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `DATABASE_URL` | SQLite database path | No |
| `AGENTMAIL_API_KEY` | AgentMail API key for sending emails | Yes |
| `AGENTMAIL_INBOX` | AgentMail inbox address | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | For SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | For SMS |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | For SMS |

## API Endpoints

### Leads
```
GET    /api/leads              - List all leads
GET    /api/leads/stats        - Lead statistics
GET    /api/leads/pending      - Leads pending outreach
GET    /api/leads/:id          - Get single lead
POST   /api/leads              - Create lead
POST   /api/leads/bulk         - Bulk create leads
POST   /api/leads/:id/send     - Send next sequence email
PATCH  /api/leads/:id/status   - Update lead status
POST   /api/leads/:id/note     - Add note to lead
```

### Salons
```
GET    /api/salons             - List all salons
GET    /api/salons/stats       - Salon statistics
GET    /api/salons/:id         - Get salon with details
POST   /api/salons             - Create salon
PATCH  /api/salons/:id         - Update salon
POST   /api/salons/:id/calculator - Calculate loss
GET    /api/salons/:id/appointments - Get appointments
GET    /api/salons/:id/clients     - Get clients
```

### Appointments
```
GET    /api/appointments       - List appointments
GET    /api/appointments/:id   - Get appointment
POST   /api/appointments       - Create appointment
POST   /api/appointments/:id/confirm  - Confirm
POST   /api/appointments/:id/deny     - Cancel/deny
POST   /api/appointments/:id/no-show  - Mark no-show
POST   /api/appointments/:id/complete - Mark completed
GET    /api/appointments/stats - Get statistics
```

## Product Tiers

### Basic — $79/month
- Automated 48hr/24hr reminders via SMS/email
- One-click confirmation
- Basic analytics
- Email support

### Pro — $149/month
- Everything in Basic
- **Waitlist auto-backfill**
- **Client no-show scoring**
- Two-way texting
- Square/Vagaro integration
- Priority support

## Project Structure
```
chairguard/
├── SPEC.md                    # Product specification
├── README.md                  # This file
├── package.json
├── .env.example
├── data/                      # SQLite database (created at runtime)
├── docs/                      # Additional documentation
├── infrastructure/             # Docker, deploy configs
│   └── docker/
├── src/
│   ├── backend/
│   │   ├── index.js           # Express server
│   │   ├── db/
│   │   │   ├── database.js    # DB connection + helpers
│   │   │   ├── schema.sql     # Database schema
│   │   │   └── migrate.js     # Migration runner
│   │   ├── models/             # Data models
│   │   │   ├── Lead.js
│   │   │   ├── Salon.js
│   │   │   ├── Appointment.js
│   │   │   ├── Client.js
│   │   │   └── EmailSequence.js
│   │   ├── routes/            # API routes
│   │   │   ├── leads.js
│   │   │   ├── salons.js
│   │   │   └── appointments.js
│   │   └── services/          # Business logic
│   │       ├── EmailService.js
│   │       └── ReminderService.js
│   └── frontend/
│       └── index.html         # Landing page + calculator
└── tests/                     # Unit tests
```

## Email Sequences

Standard outreach sequence for new leads:
- **Day 0:** Initial email (Template A or B)
- **Day 2:** Follow-up #1 (case study)
- **Day 5:** Follow-up #2 (social proof)
- **Day 10:** Final follow-up
- **Day 14:** Lead marked as exhausted if no response

## No-Show Scoring

Client risk levels based on no-show history:
- **Green (0-1):** Fully confirmed, no flags
- **Yellow (2):** Requires confirmation, 50% deposit requested
- **Red (3+):** Auto-waitlist only, full prepayment required

## Roadmap

- [ ] Square Appointments integration
- [ ] Vagaro integration
- [ ] Stripe payments
- [ ] Landing page with live calculator
- [ ] SMS reminders via Twilio
- [ ] Waitlist backfill automation
- [ ] Client portal
- [ ] Email open/click tracking

## Deployment

ChairGuard uses a **split architecture** for optimal deployment:
- **Frontend** → Vercel (static site, global CDN)
- **Backend API** → Railway (Node.js server with SQLite)

### Architecture Overview

```
                    ┌─────────────────┐
                    │   chairguard.io  │
                    │   (Vercel CDN)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Vercel Edge   │
                    │  (Static Files) │
                    └─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Railway      │
                    │  (Backend API)  │
                    │   + SQLite      │
                    └─────────────────┘
```

---

## Deploy to Railway (Backend API)

Railway is recommended for the backend because it supports:
- ✅ Persistent Node.js servers
- ✅ Native modules (SQLite/better-sqlite3)
- ✅ Cron jobs
- ✅ Environment variables

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select `AbsoluteUn1t/ChairGuard`
4. Railway will auto-detect Node.js and deploy

### Step 2: Configure Environment Variables

In Railway's dashboard, go to **Variables** and add:

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | `3000` | Railway sets this automatically |
| `DATABASE_URL` | `./data/chairguard.db` | SQLite database path |
| `AGENTMAIL_API_KEY` | `your_agentmail_api_key` | Get from AgentMail |
| `AGENTMAIL_INBOX` | `your_inbox@agentmail.to` | Your AgentMail inbox |
| `TWILIO_ACCOUNT_SID` | `your_twilio_sid` | Optional - for SMS |
| `TWILIO_AUTH_TOKEN` | `your_twilio_token` | Optional - for SMS |
| `TWILIO_PHONE_NUMBER` | `+1234567890` | Optional - for SMS |

### Step 3: Initialize Database

1. Go to Railway's **Shell** tab
2. Run the migration:
   ```bash
   npm run db:migrate
   ```

### Step 4: Get Backend URL

After deployment, Railway provides a URL like:
```
https://chairguard-backend.up.railway.app
```

**Note:** You'll need this URL to configure the frontend.

---

## Deploy to Vercel (Frontend)

### Step 1: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New** → **Project**
3. Import `AbsoluteUn1t/ChairGuard`
4. For the **Root Directory**, select `frontend`
5. Click **Deploy**

### Step 2: Configure Domain (chairguard.io)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add `chairguard.io`
3. Update your DNS records at Hostinger:
   
   **Option A: CNAME Record (Recommended)**
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
   
   **Option B: A Record (if CNAME not supported)**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

4. Wait for SSL certificate (automatic, 5-30 minutes)

### Step 3: Update Frontend API URL

The frontend needs to know the backend API URL. In Vercel's dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add:
   ```
   VITE_API_URL=https://chairguard-backend.up.railway.app
   ```

3. Redeploy the frontend for the change to take effect

---

## Update Frontend API Configuration

Before deploying, update the frontend to use your Railway backend URL:

1. Edit `frontend/index.html`
2. Find the API base URL configuration (near line ~1800)
3. Update it to your Railway backend URL:
   ```javascript
   const API_BASE = 'https://chairguard-backend.up.railway.app';
   ```

---

## Quick Setup Summary

| Step | Platform | URL Format |
|------|----------|------------|
| Backend API | Railway | `chairguard.up.railway.app` |
| Frontend | Vercel | `chairguard.io` |
| Database | SQLite | Stored on Railway filesystem |

---

## Troubleshooting

### Backend (Railway)

**Database not initializing:**
```bash
npm run db:migrate
```

**Cron jobs not running:**
Railway's free tier has limitations. Consider:
- Using a external cron service (cron-job.org)
- Upgrading to Railway Pro

**Environment variables not working:**
- Restart the deployment after adding variables
- Check for typos in variable names

### Frontend (Vercel)

**API calls failing:**
- Verify `VITE_API_URL` is set correctly
- Check browser console for CORS errors
- Ensure Railway backend is running

**Domain not working:**
- DNS propagation takes 5-30 minutes
- Verify CNAME records at your registrar
- Check Vercel's domain verification status

**SSL certificate issues:**
- Wait 5-30 minutes after adding domain
- Vercel auto-provisions Let's Encrypt

---

## License
MIT
