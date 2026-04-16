# ChairGuard — Product Specification

## Overview
**ChairGuard** is a micro-SaaS that helps salons eliminate no-show losses through automated confirmation, waitlist backfill, and client no-show scoring.

## Core Problem
- **30-50% no-show rate** across salons
- **$80-200/hr** revenue loss per empty chair
- **$93K-$187K/year** estimated loss for a 5-chair salon

## Target Customer
- **Geography:** Ohio, then US expansion
- **Profile:** Independent salons with 2-10 chairs
- **Booking Platform:** Square, Vagaro, Calendly, Mindbody, or manual
- **Owner Profile:** Busy salon owner who is the de-facto manager

## Product Tiers

### Basic — $79/month
- Automated SMS/Email reminders at 48hr and 24hr
- One-click appointment confirmation
- Basic no-show analytics dashboard
- Email support

### Pro — $149/month
- Everything in Basic
- **Waitlist auto-backfill** — when someone cancels/no-shows, offer slot to waitlist
- **Client no-show scoring** — identify chronic offenders
- **Two-way texting** — client can confirm/cancel via reply
- Priority support
- **Square/Vagaro integration**

## Workflow

### Confirmation Flow
1. **Appointment created** → Store in ChairGuard DB
2. **48hr before** → Send SMS: "Hi {name}, your appointment at {salon} is {date} {time}. Reply YES to confirm or NO to cancel."
3. **24hr before** → If no response: Send reminder SMS + email
4. **6hr before** → If still no response: Mark as "unconfirmed" → Offer to waitlist
5. **Appointment time** → If no-show: Log in CRM, offer waitlist

### Waitlist Backfill
1. Client on waitlist gets SMS: "A slot opened at {salon} on {date} {time}. Want it? Reply YES."
2. First "YES" wins → New appointment booked
3. Original no-show client gets flagged in scoring

### No-Show Scoring
- **Green (0-1 no-shows):** Fully confirmed, no flags
- **Yellow (2 no-shows):** Requires confirmation, 50% deposit requested
- **Red (3+ no-shows):** Auto-waitlist only, full prepayment required

## Features

### Lead Capture (Landing Page)
- No-show impact calculator (inputs: # chairs, avg hourly rate, est. no-show %)
- Shows potential annual loss
- Email capture for report
- CTA: "Get Your Free No-Show Analysis"

### CRM
- Lead status: New → Contacted → Qualified → Demo Scheduled → Customer → churned
- Activity tracking: emails sent, responses, calls
- Notes per lead

### Email Sequences
- **Day 0:** Initial outreach (we did this)
- **Day 2:** Follow-up #1 (if no response)
- **Day 5:** Follow-up #2 (case study)
- **Day 10:** Final follow-up (discount offer)
- **Day 14:** Remove from sequence, mark as "exhausted"

### Analytics Dashboard
- **No-show rate** over time
- **Revenue recovered** (through backfill)
- **Confirmation rate** by day of week
- **Client risk scores** distribution

## Technical Stack
- **Frontend:** Vanilla JS/CSS (no framework for MVP speed)
- **Backend:** Node.js + Express
- **Database:** SQLite (MVP) → PostgreSQL (production)
- **SMS:** Twilio
- **Email:** AgentMail (we have it!)
- **Hosting:** Docker, deployable to Railway/Render/coolify

## Integrations (v1)
- [ ] Square Appointments API
- [ ] Vagaro API
- [ ] Google Calendar (read-only)
- [ ] Manual CSV import

## Non-Goals (v1)
- Payments/quoting (Stripe in v2)
- Native mobile app
- White-label

## Success Metrics
- **5 customers** in month 1 (~$500 MRR)
- **15 customers** in month 3 (~$1,500 MRR)
- **50 customers** in month 6 (~$4,000 MRR)
- **< 5% churn** monthly
