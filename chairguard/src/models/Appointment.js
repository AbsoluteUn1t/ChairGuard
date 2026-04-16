import { v4 as uuid } from 'uuid';
import { query, get, run, insert, update } from '../db/database.js';

/**
 * Appointment Model — tracks appointments and no-shows
 */
export const AppointmentModel = {
  table: 'appointments',

  /**
   * Create a new appointment
   */
  create(data) {
    const id = uuid();
    const now = new Date().toISOString();
    
    const appointment = {
      id,
      salon_id: data.salon_id,
      client_name: data.client_name,
      client_phone: data.client_phone || null,
      client_email: data.client_email || null,
      service: data.service || null,
      scheduled_at: data.scheduled_at, // ISO8601
      duration_minutes: data.duration_minutes || 60,
      status: 'pending',
      confirmation_status: 'unconfirmed',
      no_show_score: 0,
      waitlist_id: null,
      reminder_48h_sent: 0,
      reminder_24h_sent: 0,
      reminder_6h_sent: 0,
      notes: null,
      created_at: now,
      updated_at: now
    };

    return insert(this.table, appointment);
  },

  /**
   * Find appointment by ID
   */
  findById(id) {
    return get(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
  },

  /**
   * Get appointments for a salon
   */
  findBySalon(salonId, filters = {}) {
    let sql = `SELECT * FROM ${this.table} WHERE salon_id = ?`;
    const params = [salonId];

    if (filters.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }
    if (filters.date) {
      sql += ` AND date(scheduled_at) = date(?)`;
      params.push(filters.date);
    }
    if (filters.from) {
      sql += ` AND scheduled_at >= ?`;
      params.push(filters.from);
    }
    if (filters.to) {
      sql += ` AND scheduled_at <= ?`;
      params.push(filters.to);
    }

    sql += ` ORDER BY scheduled_at ASC`;

    return query(sql, params);
  },

  /**
   * Get appointments needing 48hr reminder
   */
  findNeeding48hReminder() {
    const in48hrs = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const in47hrs = new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString();
    
    return query(`
      SELECT a.*, s.name as salon_name, s.phone as salon_phone
      FROM ${this.table} a
      JOIN salons s ON a.salon_id = s.id
      WHERE a.status = 'pending'
      AND a.confirmation_status = 'unconfirmed'
      AND a.reminder_48h_sent = 0
      AND a.scheduled_at BETWEEN ? AND ?
    `, [in47hrs, in48hrs]);
  },

  /**
   * Get appointments needing 24hr reminder
   */
  findNeeding24hReminder() {
    const in24hrs = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const in23hrs = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    
    return query(`
      SELECT a.*, s.name as salon_name, s.phone as salon_phone
      FROM ${this.table} a
      JOIN salons s ON a.salon_id = s.id
      WHERE a.status = 'pending'
      AND a.confirmation_status != 'confirmed'
      AND a.reminder_24h_sent = 0
      AND a.scheduled_at BETWEEN ? AND ?
    `, [in23hrs, in24hrs]);
  },

  /**
   * Get appointments needing 6hr reminder
   */
  findNeeding6hReminder() {
    const in6hrs = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const in5hrs = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    
    return query(`
      SELECT a.*, s.name as salon_name, s.phone as salon_phone
      FROM ${this.table} a
      JOIN salons s ON a.salon_id = s.id
      WHERE a.status = 'pending'
      AND a.confirmation_status != 'confirmed'
      AND a.reminder_6h_sent = 0
      AND a.scheduled_at BETWEEN ? AND ?
    `, [in5hrs, in6hrs]);
  },

  /**
   * Mark appointment as confirmed
   */
  confirm(id) {
    return update(this.table, id, {
      confirmation_status: 'confirmed',
      status: 'pending'
    });
  },

  /**
   * Mark appointment as denied/cancelled by client
   */
  deny(id) {
    return update(this.table, id, {
      confirmation_status: 'denied',
      status: 'cancelled'
    });
  },

  /**
   * Mark appointment as no-show
   */
  markNoShow(id) {
    const appointment = this.findById(id);
    if (!appointment) return null;

    // Update appointment
    update(this.table, id, {
      status: 'no_show',
      confirmation_status: 'unconfirmed'
    });

    // Update client no-show score
    if (appointment.client_phone) {
      const { ClientModel } = require('./Client.js');
      ClientModel.incrementNoShow(appointment.client_phone, appointment.salon_id);
    }

    return this.findById(id);
  },

  /**
   * Mark appointment as completed
   */
  complete(id) {
    return update(this.table, id, {
      status: 'completed'
    });
  },

  /**
   * Mark reminder as sent
   */
  markReminderSent(id, type) {
    const field = `reminder_${type}h_sent`;
    return update(this.table, id, {
      [field]: 1
    });
  },

  /**
   * Get appointment statistics for a salon
   */
  getStats(salonId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const stats = query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN confirmation_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN confirmation_status = 'unconfirmed' THEN 1 ELSE 0 END) as unconfirmed
      FROM ${this.table}
      WHERE salon_id = ?
      AND created_at >= ?
    `, [salonId, since]);

    const result = stats[0] || { total: 0 };
    result.no_show_rate = result.total > 0 
      ? (result.no_shows / result.total * 100).toFixed(1)
      : 0;
    result.confirmation_rate = result.total > 0
      ? (result.confirmed / result.total * 100).toFixed(1)
      : 0;

    return result;
  },

  /**
   * Get daily no-show trend
   */
  getDailyTrend(salonId, days = 30) {
    return query(`
      SELECT 
        date(scheduled_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        SUM(CASE WHEN confirmation_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
      FROM ${this.table}
      WHERE salon_id = ?
      AND scheduled_at >= datetime('now', ?)
      GROUP BY date(scheduled_at)
      ORDER BY date ASC
    `, [salonId, `-${days} days`]);
  }
};

export default AppointmentModel;
