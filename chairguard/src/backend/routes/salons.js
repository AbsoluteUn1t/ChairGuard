import { Router } from 'express';
import { SalonModel } from '../../models/Salon.js';
import { AppointmentModel } from '../../models/Appointment.js';
import { ClientModel } from '../../models/Client.js';

const router = Router();

/**
 * GET /api/salons
 * List all salons
 */
router.get('/', async (req, res) => {
  try {
    const { status, plan, limit } = req.query;
    const salons = SalonModel.findAll({ status, plan, limit });
    res.json({ salons });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/salons/stats
 * Get salon statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const salons = SalonModel.findAll();
    const totalSalons = salons.length;
    const basicCount = salons.filter(s => s.plan === 'basic').length;
    const proCount = salons.filter(s => s.plan === 'pro').length;
    const activeCount = salons.filter(s => s.status === 'active').length;

    res.json({
      total: totalSalons,
      by_plan: { basic: basicCount, pro: proCount },
      by_status: { active: activeCount }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/salons/:id
 * Get single salon with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const salon = SalonModel.findById(req.params.id);
    if (!salon) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    // Get appointment stats
    const apptStats = AppointmentModel.getStats(req.params.id);
    
    // Get client risk distribution
    const riskDist = ClientModel.getRiskDistribution(req.params.id);

    // Calculate potential loss
    const lossCalc = SalonModel.calculateAnnualLoss(salon);

    res.json({
      salon,
      stats: {
        appointments: apptStats,
        risk_distribution: riskDist
      },
      calculator: lossCalc
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/salons
 * Create a new salon (customer)
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address, website, booking_platform, plan, chairs, avg_hourly_rate } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const salon = SalonModel.create({
      name,
      email,
      phone,
      address,
      website,
      booking_platform,
      plan,
      chairs,
      avg_hourly_rate
    });

    res.status(201).json({ salon });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/salons/:id
 * Update salon
 */
router.patch('/:id', async (req, res) => {
  try {
    const salon = SalonModel.findById(req.params.id);
    if (!salon) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    SalonModel.update(req.params.id, req.body);
    const updated = SalonModel.findById(req.params.id);

    res.json({ salon: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/salons/:id/appointments
 * Get appointments for a salon
 */
router.get('/:id/appointments', async (req, res) => {
  try {
    const { status, date, from, to } = req.query;
    const appointments = AppointmentModel.findBySalon(req.params.id, {
      status,
      date,
      from,
      to
    });
    res.json({ appointments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/salons/:id/clients
 * Get clients for a salon
 */
router.get('/:id/clients', async (req, res) => {
  try {
    const { risk_level } = req.query;
    const clients = ClientModel.findBySalon(req.params.id, { risk_level });
    res.json({ clients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/salons/:id/calculator
 * Calculate potential loss for a salon
 */
router.post('/:id/calculator', async (req, res) => {
  try {
    const salon = SalonModel.findById(req.params.id);
    if (!salon) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    // Allow override params
    const params = {
      ...salon,
      ...req.body
    };

    const calc = SalonModel.calculateAnnualLoss(params);
    res.json(calc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/salons/:id/appointments
 * Create an appointment for a salon
 */
router.post('/:id/appointments', async (req, res) => {
  try {
    const salon = SalonModel.findById(req.params.id);
    if (!salon) {
      return res.status(404).json({ error: 'Salon not found' });
    }

    const { client_name, client_phone, client_email, service, scheduled_at, duration_minutes } = req.body;

    if (!client_name || !scheduled_at) {
      return res.status(400).json({ error: 'client_name and scheduled_at are required' });
    }

    const appointment = AppointmentModel.create({
      salon_id: req.params.id,
      client_name,
      client_phone,
      client_email,
      service,
      scheduled_at,
      duration_minutes
    });

    res.status(201).json({ appointment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
