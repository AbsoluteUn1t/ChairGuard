import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import leadsRouter from './routes/leads.js';
import salonsRouter from './routes/salons.js';
import appointmentsRouter from './routes/appointments.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Initialize database
try {
  initDatabase();
  console.log('✅ Database initialized');
} catch (err) {
  console.error('❌ Database initialization failed:', err.message);
  process.exit(1);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'ChairGuard API',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/leads', leadsRouter);
app.use('/api/salons', salonsRouter);
app.use('/api/appointments', appointmentsRouter);

// Email service check endpoint
app.get('/api/email/stats', async (req, res) => {
  try {
    const { EmailService } = await import('../services/EmailService.js');
    const emailService = new EmailService();
    const stats = await emailService.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🪑 ChairGuard API Server                           ║
║                                                       ║
║   Running on: http://localhost:${PORT}                  ║
║   Environment: ${process.env.NODE_ENV || 'development'}                        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
