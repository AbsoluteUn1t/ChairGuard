import { query } from '../db/database.js';

/**
 * Email Service — sends emails via AgentMail API
 */
export class EmailService {
  constructor() {
    this.apiKey = process.env.AGENTMAIL_API_KEY;
    this.inboxId = process.env.AGENTMAIL_INBOX || 'growyourmargins@agentmail.to';
    this.baseUrl = 'https://api.agentmail.to/v0/inboxes';
  }

  /**
   * Send an email
   */
  async send({ to, subject, text, html = null, cc = null }) {
    const url = `${this.baseUrl}/${encodeURIComponent(this.inboxId)}/messages/send`;
    
    const payload = {
      to: Array.isArray(to) ? to : [to],
      subject,
      text
    };

    if (html) payload.html = html;
    if (cc) payload.cc = Array.isArray(cc) ? cc : [cc];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Email send failed: ${data.message || data.error || response.statusText}`);
    }

    return data;
  }

  /**
   * Send to a lead from the sequence
   */
  async sendSequenceEmail(sequence) {
    if (!sequence.body || !sequence.email) {
      throw new Error('Missing body or email in sequence');
    }

    return this.send({
      to: sequence.email,
      subject: sequence.subject,
      text: sequence.body
    });
  }

  /**
   * Check inbox for bounces and responses
   */
  async checkInbox() {
    const url = `${this.baseUrl}/${encodeURIComponent(this.inboxId)}/messages?limit=100`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Inbox check failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.messages || [];
  }

  /**
   * Categorize messages
   */
  categorizeMessages(messages) {
    const categorized = {
      bounced: [],
      replied: [],
      sent: [],
      delayed: [],
      received: []
    };

    for (const msg of messages) {
      const labels = msg.labels || [];
      
      if (labels.includes('bounced')) {
        categorized.bounced.push(msg);
      } else if (labels.includes('delayed')) {
        categorized.delayed.push(msg);
      } else if (labels.includes('sent')) {
        categorized.sent.push(msg);
      } else if (labels.includes('received')) {
        // Check if it's a real response (not mailer-daemon)
        const from = (msg.from || '').toLowerCase();
        if (!from.includes('mailer') && !from.includes('postmaster')) {
          categorized.replied.push(msg);
        }
      }
    }

    return categorized;
  }

  /**
   * Get email stats
   */
  async getStats() {
    const messages = await this.checkInbox();
    const categorized = this.categorizeMessages(messages);

    const total = messages.length;
    const bounced = categorized.bounced.length;
    const sent = categorized.sent.length;
    const replies = categorized.replied.length;
    const delayed = categorized.delayed.length;

    return {
      total,
      sent,
      bounced,
      delayed,
      replies,
      bounceRate: sent > 0 ? ((bounced / sent) * 100).toFixed(1) : 0,
      responseRate: sent > 0 ? ((replies / sent) * 100).toFixed(1) : 0
    };
  }
}

export default EmailService;
