import { v4 as uuid } from 'uuid';
import { query, get, run, insert, update } from '../backend/db/database.js';

/**
 * Salon Model — represents a paying customer salon
 */
export const SalonModel = {
  table: 'salons',

  /**
   * Create a new salon
   */
  create(data) {
    const id = uuid();
    const now = new Date().toISOString();
    
    const salon = {
      id,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      address: data.address || null,
      website: data.website || null,
      booking_platform: data.booking_platform || 'manual',
      plan: data.plan || 'basic',
      status: 'trial',
      chairs: data.chairs || 1,
      avg_hourly_rate: data.avg_hourly_rate || 100,
      no_show_rate: data.no_show_rate || 0.35,
      created_at: now,
      updated_at: now
    };

    return insert(this.table, salon);
  },

  /**
   * Find salon by ID
   */
  findById(id) {
    return get(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
  },

  /**
   * Find salon by email
   */
  findByEmail(email) {
    return get(`SELECT * FROM ${this.table} WHERE email = ?`, [email]);
  },

  /**
   * Get all salons with optional filters
   */
  findAll(filters = {}) {
    let sql = `SELECT * FROM ${this.table}`;
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.plan) {
      conditions.push('plan = ?');
      params.push(filters.plan);
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
   * Update salon
   */
  update(id, data) {
    return update(this.table, id, data);
  },

  /**
   * Calculate annual loss based on salon params
   */
  calculateAnnualLoss(salon) {
    const chairs = salon.chairs || 1;
    const hourlyRate = salon.avg_hourly_rate || 100;
    const noShowRate = salon.no_show_rate || 0.35;
    const hoursPerDay = 8;
    const daysPerWeek = 6;
    const weeksPerYear = 52;

    // Revenue per chair per year = hourly rate × hours × days × weeks × no-show rate
    const lossPerChair = hourlyRate * hoursPerDay * daysPerWeek * weeksPerYear * noShowRate;
    const totalLoss = lossPerChair * chairs;

    return {
      chairs,
      hourlyRate,
      noShowRate,
      lossPerChairPerYear: Math.round(lossPerChair),
      totalLossPerYear: Math.round(totalLoss),
      lossPerMonth: Math.round(totalLoss / 12),
      lossPerWeek: Math.round(totalLoss / 52)
    };
  },

  /**
   * Get salon statistics
   */
  getStats(id) {
    const appointments = query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN confirmation_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
      FROM appointments 
      WHERE salon_id = ? 
      AND created_at > datetime('now', '-30 days')`,
      [id]
    );

    return appointments[0] || { total: 0, no_shows: 0, completed: 0, confirmed: 0 };
  }
};

export default SalonModel;
