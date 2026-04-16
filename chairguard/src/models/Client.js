import { v4 as uuid } from 'uuid';
import { query, get, insert, update } from '../db/database.js';

/**
 * Client Model — tracks salon clients with no-show scoring
 * 
 * Risk Levels:
 * - green: 0-1 no-shows — Fully confirmed, no flags
 * - yellow: 2 no-shows — Requires confirmation, 50% deposit requested
 * - red: 3+ no-shows — Auto-waitlist only, full prepayment required
 */
export const ClientModel = {
  table: 'clients',

  /**
   * Create a new client
   */
  create(data) {
    const id = uuid();
    const now = new Date().toISOString();
    
    const client = {
      id,
      salon_id: data.salon_id,
      name: data.name,
      email: data.email || null,
      phone: data.phone,
      no_show_count: 0,
      visit_count: 0,
      last_no_show_at: null,
      risk_level: 'green',
      created_at: now,
      updated_at: now
    };

    return insert(this.table, client);
  },

  /**
   * Find client by phone
   */
  findByPhone(phone, salonId) {
    return get(`SELECT * FROM ${this.table} WHERE phone = ? AND salon_id = ?`, [phone, salonId]);
  },

  /**
   * Find or create client by phone
   */
  findOrCreate(data) {
    let client = this.findByPhone(data.phone, data.salon_id);
    if (!client) {
      client = this.create(data);
    }
    return client;
  },

  /**
   * Increment no-show count and update risk level
   */
  incrementNoShow(phone, salonId) {
    const client = this.findByPhone(phone, salonId);
    if (!client) return null;

    const newCount = client.no_show_count + 1;
    let riskLevel = 'green';
    
    if (newCount >= 3) {
      riskLevel = 'red';
    } else if (newCount === 2) {
      riskLevel = 'yellow';
    }

    update(this.table, client.id, {
      no_show_count: newCount,
      last_no_show_at: new Date().toISOString(),
      risk_level: riskLevel
    });

    return this.findById(client.id);
  },

  /**
   * Increment visit count (on successful appointment)
   */
  incrementVisit(phone, salonId) {
    const client = this.findByPhone(phone, salonId);
    if (!client) return null;

    update(this.table, client.id, {
      visit_count: client.visit_count + 1
    });

    return this.findById(client.id);
  },

  /**
   * Find client by ID
   */
  findById(id) {
    return get(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
  },

  /**
   * Get all clients for a salon
   */
  findBySalon(salonId, filters = {}) {
    let sql = `SELECT * FROM ${this.table} WHERE salon_id = ?`;
    const params = [salonId];

    if (filters.risk_level) {
      sql += ` AND risk_level = ?`;
      params.push(filters.risk_level);
    }

    sql += ` ORDER BY no_show_count DESC`;

    return query(sql, params);
  },

  /**
   * Get risk distribution
   */
  getRiskDistribution(salonId) {
    const stats = query(`
      SELECT 
        risk_level,
        COUNT(*) as count
      FROM ${this.table}
      WHERE salon_id = ?
      GROUP BY risk_level
    `, [salonId]);

    const dist = { green: 0, yellow: 0, red: 0 };
    for (const row of stats) {
      dist[row.risk_level] = row.count;
    }
    return dist;
  },

  /**
   * Get high-risk clients (red) for a salon
   */
  findHighRisk(salonId) {
    return query(`
      SELECT * FROM ${this.table}
      WHERE salon_id = ?
      AND risk_level = 'red'
      ORDER BY last_no_show_at DESC
    `, [salonId]);
  }
};

export default ClientModel;
