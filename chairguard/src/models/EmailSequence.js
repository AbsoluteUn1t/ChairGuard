import { v4 as uuid } from 'uuid';
import { query, get, insert, update } from '../db/database.js';

/**
 * EmailSequence Model — automated outreach sequences
 * 
 * Standard Outreach Sequence (for new leads):
 * - Day 0: Initial email (Template A or B)
 * - Day 2: Follow-up #1 (case study)
 * - Day 5: Follow-up #2 (social proof)
 * - Day 10: Final follow-up (discount offer)
 * - Day 14: Mark lead as exhausted if no response
 */
export const EmailSequenceModel = {
  table: 'email_sequences',

  /**
   * Default email templates
   */
  templates: {
    initial_a: {
      subject: 'Free no-show analysis for {salon_name}',
      body: `Hi,

I noticed {salon_name} - love what you're building!

Quick question: how often do you deal with no-shows? At your rate, even 2 no-shows a day at 2 hours each = ~$480/day in empty chair time.

I built a free tool that analyzes your no-show patterns and shows exactly how much revenue you're leaving on the table. Takes 60 seconds.

Worth a look?

Marcus
ChairGuard`
    },
    initial_b: {
      subject: 'Quick question about {salon_name}',
      body: `Hi,

I noticed {salon_name} - congrats on the great reviews!

Real question: how often do you get no-shows? I work with salons in Columbus who are losing $500-1000/week to empty chairs from unconfirmed appointments.

We built ChairGuard to solve exactly this. Want to see what it would look like for your salon?

Marcus
ChairGuard`
    },
    followup_1: {
      subject: 'Re: {salon_name} - case study',
      body: `Hi,

Following up on my previous note about ChairGuard.

I recently helped a Columbus salon reduce their no-show rate from 40% to under 10% in just 30 days. Their monthly revenue increased by $2,400.

Happy to share the details if you're curious.

Marcus
ChairGuard`
    },
    followup_2: {
      subject: '{salon_name} - 3 salons in your area are trying this',
      body: `Hi,

Three salons in your area have started using ChairGuard this month.

They're all seeing the same thing: no-shows were quietly killing their revenue, and they didn't realize how much until they saw the numbers.

I've put together a free 60-second analysis that shows exactly where you stand.

Marcus
ChairGuard`
    },
    final: {
      subject: 'Last note - {salon_name}',
      body: `Hi,

I don't want to take up more of your time.

If you're not interested in ChairGuard, totally understand. But if you're curious, this is the last email you'll get from me about it.

Here's the link to the free analyzer: {landing_page_url}

If you ever want to chat, I'm here.

Marcus
ChairGuard`
    }
  },

  /**
   * Create a sequence entry
   */
  create(data) {
    const id = uuid();
    const now = new Date().toISOString();
    
    const sequence = {
      id,
      lead_id: data.lead_id,
      sequence_type: data.sequence_type || 'outreach',
      step: data.step || 0,
      scheduled_for: data.scheduled_for || null,
      sent_at: null,
      subject: data.subject || null,
      body: data.body || null,
      status: 'pending'
    };

    return insert(this.table, sequence);
  },

  /**
   * Start a new sequence for a lead
   */
  startSequence(lead, salonData) {
    // Determine which template to start with (A or B based on lead source)
    const templateKey = lead.source === 'cold_email' ? 'initial_a' : 'initial_b';
    const template = this.templates[templateKey];

    // Replace placeholders
    const subject = template.subject
      .replace('{salon_name}', lead.salon_name)
      .replace('{landing_page_url}', process.env.FRONTEND_URL || 'http://localhost:3000');

    const body = template.body
      .replace('{salon_name}', lead.salon_name)
      .replace('{landing_page_url}', process.env.FRONTEND_URL || 'http://localhost:3000');

    // Create step 0 (immediate)
    return this.create({
      lead_id: lead.id,
      sequence_type: 'outreach',
      step: 0,
      scheduled_for: new Date().toISOString(),
      subject,
      body
    });
  },

  /**
   * Get next pending sequence for a lead
   */
  getNextPending(leadId) {
    return get(`
      SELECT * FROM ${this.table}
      WHERE lead_id = ?
      AND status = 'pending'
      ORDER BY step ASC
      LIMIT 1
    `, [leadId]);
  },

  /**
   * Get all pending sequences across all leads
   */
  findPendingReady() {
    const now = new Date().toISOString();
    return query(`
      SELECT es.*, l.email, l.salon_name, l.salon_website
      FROM ${this.table} es
      JOIN leads l ON es.lead_id = l.id
      WHERE es.status = 'pending'
      AND es.scheduled_for <= ?
      AND l.status IN ('new', 'contacted')
      ORDER BY es.scheduled_for ASC
    `, [now]);
  },

  /**
   * Mark sequence as sent
   */
  markSent(id, sentAt = new Date().toISOString()) {
    return update(this.table, id, {
      status: 'sent',
      sent_at: sentAt
    });
  },

  /**
   * Mark sequence as bounced
   */
  markBounced(id) {
    return update(this.table, id, {
      status: 'bounced'
    });
  },

  /**
   * Mark sequence as replied
   */
  markReplied(id) {
    return update(this.table, id, {
      status: 'replied'
    });
  },

  /**
   * Schedule next step in sequence
   */
  scheduleNext(previousSequenceId, leadId) {
    const previous = get(`SELECT * FROM ${this.table} WHERE id = ?`, [previousSequenceId]);
    if (!previous) return null;

    const nextStep = previous.step + 1;
    if (nextStep > 4) return null; // End of sequence

    // Calculate send date
    const delays = [0, 2, 5, 10]; // days after previous
    const sendDate = new Date();
    sendDate.setDate(sendDate.getDate() + (delays[nextStep] || 10));

    // Get template
    const templateKeys = ['initial_a', 'followup_1', 'followup_2', 'final'];
    const templateKey = templateKeys[nextStep] || 'final';
    const template = this.templates[templateKey];

    // Get lead for placeholder replacement
    const lead = get(`SELECT * FROM leads WHERE id = ?`, [leadId]);
    if (!lead) return null;

    const subject = template.subject
      .replace('{salon_name}', lead.salon_name)
      .replace('{landing_page_url}', process.env.FRONTEND_URL || 'http://localhost:3000');

    const body = template.body
      .replace('{salon_name}', lead.salon_name)
      .replace('{landing_page_url}', process.env.FRONTEND_URL || 'http://localhost:3000');

    return this.create({
      lead_id: leadId,
      sequence_type: 'outreach',
      step: nextStep,
      scheduled_for: sendDate.toISOString(),
      subject,
      body
    });
  },

  /**
   * Get sequence status for a lead
   */
  getLeadSequenceStatus(leadId) {
    return query(`
      SELECT * FROM ${this.table}
      WHERE lead_id = ?
      ORDER BY step ASC
    `, [leadId]);
  }
};

export default EmailSequenceModel;
