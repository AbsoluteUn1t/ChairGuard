import { Router } from 'express';
import { LeadModel } from '../models/Lead.js';
import { EmailSequenceModel } from '../models/EmailSequence.js';
import { EmailService } from '../services/EmailService.js';

const router = Router();
const emailService = new EmailService();

/**
 * GET /api/leads
 * List all leads with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, source, limit } = req.query;
    const leads = LeadModel.findAll({ status, source, limit });
    res.json({ leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leads/stats
 * Get lead statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = LeadModel.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leads/pending
 * Get leads pending outreach
 */
router.get('/pending', async (req, res) => {
  try {
    const leads = LeadModel.findPendingOutreach();
    res.json({ leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leads/:id
 * Get single lead
 */
router.get('/:id', async (req, res) => {
  try {
    const lead = LeadModel.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get email sequence status
    const sequence = EmailSequenceModel.getLeadSequenceStatus(req.params.id);
    
    res.json({ lead, sequence });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads
 * Create a new lead
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, salon_name, salon_address, salon_website, source } = req.body;

    if (!email || !salon_name) {
      return res.status(400).json({ error: 'Email and salon_name are required' });
    }

    // Check for existing
    const existing = LeadModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Lead with this email already exists' });
    }

    const lead = LeadModel.create({
      name,
      email,
      phone,
      salon_name,
      salon_address,
      salon_website,
      source: source || 'manual'
    });

    // Log activity
    LeadModel.logActivity(lead.id, 'created', 'Lead created');

    res.status(201).json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/bulk
 * Bulk create leads (from Outscraper batch)
 */
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    
    if (!Array.isArray(leads)) {
      return res.status(400).json({ error: 'leads array is required' });
    }

    const created = LeadModel.bulkCreate(leads);
    res.status(201).json({ count: created.length, leads: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/:id/send
 * Send next sequence email to a lead
 */
router.post('/:id/send', async (req, res) => {
  try {
    const lead = LeadModel.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get or create sequence
    let sequence = EmailSequenceModel.getNextPending(req.params.id);
    
    if (!sequence) {
      // Start new sequence
      sequence = EmailSequenceModel.startSequence(lead);
    }

    // Send email
    const result = await emailService.sendSequenceEmail({
      ...sequence,
      email: lead.email
    });

    // Mark as sent
    EmailSequenceModel.markSent(sequence.id);

    // Update lead status
    LeadModel.markContacted(lead.id);

    // Log activity
    LeadModel.logActivity(lead.id, 'email_sent', `Sent: ${sequence.subject}`);

    // Schedule next step
    const nextSequence = EmailSequenceModel.scheduleNext(sequence.id, lead.id);

    res.json({ 
      success: true, 
      message_id: result.message_id,
      sequence: nextSequence
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/leads/:id/status
 * Update lead status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'contacted', 'qualified', 'demo_scheduled', 'customer', 'exhausted', 'bounced', 'unsub'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const lead = LeadModel.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Update based on status
    switch (status) {
      case 'bounced':
        LeadModel.markBounced(req.params.id);
        break;
      case 'customer':
        LeadModel.markCustomer(req.params.id);
        break;
      case 'exhausted':
        LeadModel.markExhausted(req.params.id);
        break;
      default:
        LeadModel.update(req.params.id, { status });
    }

    LeadModel.logActivity(req.params.id, 'status_change', `Status changed to ${status}`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/:id/note
 * Add a note to a lead
 */
router.post('/:id/note', async (req, res) => {
  try {
    const { note } = req.body;
    
    if (!note) {
      return res.status(400).json({ error: 'Note is required' });
    }

    const lead = LeadModel.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Append to existing notes
    const newNotes = lead.notes 
      ? `${lead.notes}\n\n[${new Date().toISOString()}] ${note}`
      : `[${new Date().toISOString()}] ${note}`;

    LeadModel.update(req.params.id, { notes: newNotes });
    LeadModel.logActivity(req.params.id, 'note', note);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
