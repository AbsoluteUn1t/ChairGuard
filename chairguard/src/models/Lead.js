import { v4 as uuid } from 'uuid';
import { query, get, run, insert, update } from '../db/database.js';

/**
 * Lead Model — CRM for prospect tracking
 * 
 * Status Flow:
 * new → contacted → qualified → demo_scheduled → customer
 *                  ↘ exhausted (no response after 3 emails)
 *                  ↘ bounce (email bounced)
 *                  ↘ unsub (unsubscribed)
 */
export const LeadModel = {
  table: 'leads',

  /**
   * Create a new lead
   */
  create(data) {
    const id = uuid();
    const now = new Date().toISOString();
    
    const lead = {
      id,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      salon_name: data.salon_name,
      salon_address: data.salon_address || null,
      salon_website: data.salon_website || null,
      source: data.source || 'cold_email',
      status: 'new',
      plan_interest: data.plan_interest || null,
      notes: data.notes || null,
      last_contacted_at: null,
      response_received_at: null,
      created_at: now,
      updated_at: now
    };

    return insert(this.table, lead);
  },

  /**
   * Bulk create leads (from Outscraper batch)
   */
  bulkCreate(leads) {
    const results = [];
    const now = new Date().toISOString();

    const insertMany = (db.transaction ? null : (leads) => {
      for (const data of leads) {
        const id = uuid();
        const lead = {
          id,
          ...data,
          source: data.source || 'outscraper',
          status: 'new',
          created_at: now,
          updated_at: now
        };
        results.push(insert(this.table, lead));
      }
    });

    for (const data of leads) {
      const id = uuid();
      const lead = {
        id,
        name: data.name || data.salon_name || 'Unknown',
        email: data.email || `${id}@placeholder.invalid`,
        phone: data.phone || null,
        salon_name: data.salon_name || data.name || 'Unknown Salon',
        salon_address: data.address || data.salon_address || null,
        salon_website: data.website || data.salon_website || null,
        source: 'outscraper',
        status: 'new',
        created_at: now,
        updated_at: now
      };
      results.push(insert(this.table, lead));
    }
    
    return results;
  },

  /**
   * Find lead by ID
   */
  findById(id) {
    return get(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
  },

  /**
   * Find lead by email
   */
  findByEmail(email) {
    return get(`SELECT * FROM ${this.table} WHERE email = ?`, [email]);
  },

  /**
   * Get all leads with optional filters
   */
  findAll(filters = {}) {
    let sql = `SELECT * FROM ${this.table}`;
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.source) {
      conditions.push('source = ?');
      params.push(filters.source);
    }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      sql += ` LIMIT ${parseInt(filters.limit)}`;
    }

    return query(sql, params);
  },

  /**
   * Get leads pending outreach (status = new or contacted, sequence not exhausted)
   */
  findPendingOutreach() {
    return query(`
      SELECT l.*, 
        (SELECT COUNT(*) FROM email_sequences es WHERE es.lead_id = l.id) as sequence_count
      FROM ${this.table} l
      WHERE l.status IN ('new', 'contacted')
      AND l.id NOT IN (
        SELECT lead_id FROM email_sequences WHERE status = 'sent' AND step >= 3
      )
      ORDER BY l.created_at ASC
    `);
  },

  /**
   * Update lead
   */
  update(id, data) {
    return update(this.table, id, data);
  },

  /**
   * Mark lead as contacted (sent first email)
   */
  markContacted(id) {
    return update(this.table, id, {
      status: 'contacted',
      last_contacted_at: new Date().toISOString()
    });
  },

  /**
   * Mark lead as qualified (showed interest)
   */
  markQualified(id) {
    return update(this.table, id, {
      status: 'qualified'
    });
  },

  /**
   * Mark lead as bounced
   */
  markBounced(id) {
    return update(this.table, id, {
      status: 'bounced'
    });
  },

  /**
   * Mark lead as customer (closed deal)
   */
  markCustomer(id) {
    return update(this.table, id, {
      status: 'customer'
    });
  },

  /**
   * Mark lead as exhausted (no response after all attempts)
   */
  markExhausted(id) {
    return update(this.table, id, {
      status: 'exhausted'
    });
  },

  /**
   * Get lead statistics
   */
  getStats() {
    const stats = query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_count,
        SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) as qualified_count,
        SUM(CASE WHEN status = 'customer' THEN 1 ELSE 0 END) as customer_count,
        SUM(CASE WHEN status = 'exhausted' THEN 1 ELSE 0 END) as exhausted_count,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced_count
      FROM ${this.table}
    `);

    return stats[0] || {};
  },

  /**
   * Log activity for a lead
   */
  logActivity(leadId, action, description, metadata = null) {
    const id = uuid();
    const activity = {
      id,
      entity_type: 'lead',
      entity_id: leadId,
      action,
      description,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString()
    };

    return insert('activities', activity);
  }
};

export default LeadModel;
