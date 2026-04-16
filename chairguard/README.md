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

## License
MIT
