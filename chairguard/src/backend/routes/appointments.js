import { Router } from 'express';
import { AppointmentModel } from '../../models/Appointment.js';
import { ClientModel } from '../../models/Client.js';

const router = Router();

/**
 * GET /api/appointments
 * List appointments with filters
 */
router.get('/', async (req, res) => {
  try {
    const { salon_id, status, date } = req.query;
    
    if (!salon_id) {
      return res.status(400).json({ error: 'salon_id is required' });
    }

    const appointments = AppointmentModel.findBySalon(salon_id, { status, date });
    res.json({ appointments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/appointments/:id
 * Get single appointment
 */
router.get('/:id', async (req, res) => {
  try {
    const appointment = AppointmentModel.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json({ appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/appointments
 * Create an appointment
 */
router.post('/', async (req, res) => {
  try {
    const { salon_id, client_name, client_phone, client_email, service, scheduled_at, duration_minutes } = req.body;

    if (!salon_id || !client_name || !scheduled_at) {
      return res.status(400).json({ error: 'salon_id, client_name, and scheduled_at are required' });
    }

    // Find or create client
    let client = null;
    if (client_phone) {
      client = ClientModel.findOrCreate({
        salon_id,
        name: client_name,
        phone: client_phone,
        email: client_email
      });
    }

    const appointment = AppointmentModel.create({
      salon_id,
      client_name,
      client_phone,
      client_email,
      service,
      scheduled_at,
      duration_minutes
    });

    res.status(201).json({ appointment, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/appointments/:id/confirm
 * Confirm an appointment
 */
router.post('/:id/confirm', async (req, res) => {
  try {
    const appointment = AppointmentModel.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    AppointmentModel.confirm(req.params.id);

    // Increment client visit count if known
    if (appointment.client_phone) {
      ClientModel.incrementVisit(appointment.client_phone, appointment.salon_id);
    }

    const updated = AppointmentModel.findById(req.params.id);
    res.json({ appointment: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/appointments/:id/deny
 * Cancel/deny an appointment
 */
router.post('/:id/deny', async (req, res) => {
  try {
    const appointment = AppointmentModel.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    AppointmentModel.deny(req.params.id);
    const updated = AppointmentModel.findById(req.params.id);
    res.json({ appointment: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/appointments/:id/no-show
 * Mark appointment as no-show
 */
router.post('/:id/no-show', async (req, res) => {
  try {
    const appointment = AppointmentModel.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const updated = AppointmentModel.markNoShow(req.params.id);

    // Log analytics event
    const { v4: uuid } = await import('uuid');
    const { insert } = await import('../../db/database.js');
    insert('analytics_events', {
      id: uuid(),
      event_type: 'no_show',
      salon_id: appointment.salon_id,
      appointment_id: appointment.id,
      client_id: appointment.client_phone ? 
        (await import('../../models/Client.js')).ClientModel.findByPhone(appointment.client_phone, appointment.salon_id)?.id : null,
      value: 0, // Would calculate based on hourly rate
      metadata: JSON.stringify({ marked_at: new Date().toISOString() }),
      created_at: new Date().toISOString()
    });

    res.json({ appointment: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/appointments/:id/complete
 * Mark appointment as completed
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const appointment = AppointmentModel.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    AppointmentModel.complete(req.params.id);

    // Increment client visit count
    if (appointment.client_phone) {
      ClientModel.incrementVisit(appointment.client_phone, appointment.salon_id);
    }

    const updated = AppointmentModel.findById(req.params.id);
    res.json({ appointment: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/appointments/stats
 * Get appointment statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { salon_id, days = 30 } = req.query;
    
    if (!salon_id) {
      return res.status(400).json({ error: 'salon_id is required' });
    }

    const stats = AppointmentModel.getStats(salon_id, parseInt(days));
    const trend = AppointmentModel.getDailyTrend(salon_id, parseInt(days));

    res.json({ stats, trend });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
