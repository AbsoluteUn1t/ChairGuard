-- ChairGuard Database Schema

-- Salons (customers)
CREATE TABLE salons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    website TEXT,
    booking_platform TEXT, -- 'square', 'vagaro', 'mindbody', 'manual', 'other'
    plan TEXT DEFAULT 'basic', -- 'basic', 'pro'
    status TEXT DEFAULT 'trial', -- 'trial', 'active', 'churned', 'paused'
    chairs INTEGER DEFAULT 1,
    avg_hourly_rate REAL DEFAULT 100,
    no_show_rate REAL DEFAULT 0.35,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Appointments
CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    salon_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    client_email TEXT,
    service TEXT,
    scheduled_at TEXT NOT NULL, -- ISO8601
    duration_minutes INTEGER DEFAULT 60,
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled', 'no_show', 'completed'
    confirmation_status TEXT DEFAULT 'unconfirmed', -- 'unconfirmed', 'confirmed', 'denied'
    no_show_score INTEGER DEFAULT 0, -- 0-3+ based on history
    waitlist_id TEXT, -- FK to waitlist if backfilled
    reminder_48h_sent INTEGER DEFAULT 0,
    reminder_24h_sent INTEGER DEFAULT 0,
    reminder_6h_sent INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (salon_id) REFERENCES salons(id),
    FOREIGN KEY (waitlist_id) REFERENCES waitlist(id)
);

-- Waitlist (for backfill)
CREATE TABLE waitlist (
    id TEXT PRIMARY KEY,
    salon_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    client_email TEXT,
    preferred_date TEXT, -- YYYY-MM-DD
    preferred_time_start TEXT, -- HH:MM
    preferred_time_end TEXT, -- HH:MM
    status TEXT DEFAULT 'active', -- 'active', 'offered', 'booked', 'expired'
    offered_appointment_id TEXT,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (salon_id) REFERENCES salons(id)
);

-- Clients (with no-show scoring)
CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    salon_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT UNIQUE NOT NULL,
    no_show_count INTEGER DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_no_show_at TEXT,
    risk_level TEXT DEFAULT 'green', -- 'green', 'yellow', 'red'
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (salon_id) REFERENCES salons(id)
);

-- Leads (prospects from outreach)
CREATE TABLE leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    salon_name TEXT NOT NULL,
    salon_address TEXT,
    salon_website TEXT,
    source TEXT DEFAULT 'cold_email', -- 'cold_email', 'inbound', 'referral', 'outscraper'
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'demo_scheduled', 'customer', 'exhausted', 'bounce', 'unsub'
    plan_interest TEXT, -- 'basic', 'pro'
    notes TEXT,
    last_contacted_at TEXT,
    response_received_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Email Sequences (for automated outreach)
CREATE TABLE email_sequences (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    sequence_type TEXT DEFAULT 'outreach', -- 'outreach', 'onboarding', 'reengagement'
    step INTEGER DEFAULT 0,
    scheduled_for TEXT,
    sent_at TEXT,
    subject TEXT,
    body TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced', 'replied'
    FOREIGN KEY (lead_id) REFERENCES leads(id)
);

-- Activities (CRM audit trail)
CREATE TABLE activities (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'lead', 'salon', 'appointment'
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'email_sent', 'email_opened', 'email_replied', 'call', 'note', 'status_change', 'demo_scheduled'
    description TEXT,
    metadata TEXT, -- JSON for extra data
    created_at TEXT DEFAULT (datetime('now'))
);

-- Analytics Events
CREATE TABLE analytics_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL, -- 'no_show', 'backfill', 'confirmation', 'recovery'
    salon_id TEXT,
    appointment_id TEXT,
    client_id TEXT,
    value REAL, -- revenue impact
    metadata TEXT, -- JSON
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (salon_id) REFERENCES salons(id)
);

-- Indexes for performance
CREATE INDEX idx_appointments_salon ON appointments(salon_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_clients_salon ON clients(salon_id);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_waitlist_salon ON waitlist(salon_id);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_analytics_salon ON analytics_events(salon_id);
