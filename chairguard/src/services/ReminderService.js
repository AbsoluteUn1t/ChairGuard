import { AppointmentModel } from '../models/Appointment.js';
import { update } from '../db/database.js';

/**
 * Reminder Service — sends automated appointment reminders
 * 
 * Runs every 5 minutes via cron
 * Checks for appointments needing:
 * - 48hr reminder
 * - 24hr reminder
 * - 6hr reminder
 */
export class ReminderService {
  constructor(emailService, smsService = null) {
    this.emailService = emailService;
    this.smsService = smsService;
  }

  /**
   * Send 48hr reminder
   */
  async send48hReminder(appointment, salon) {
    const message = this.buildReminderMessage(appointment, salon, 48);
    
    // Send via available channels
    const results = { sms: null, email: null };

    if (this.smsService && appointment.client_phone) {
      try {
        results.sms = await this.smsService.send(appointment.client_phone, message);
      } catch (err) {
        console.error(`SMS failed for ${appointment.id}:`, err.message);
      }
    }

    if (appointment.client_email) {
      try {
        results.email = await this.emailService.send({
          to: appointment.client_email,
          subject: `Reminder: Appointment at ${salon.name} tomorrow`,
          text: message
        });
      } catch (err) {
        console.error(`Email failed for ${appointment.id}:`, err.message);
      }
    }

    // Mark as sent
    update('appointments', appointment.id, { reminder_48h_sent: 1 });

    return results;
  }

  /**
   * Send 24hr reminder
   */
  async send24hReminder(appointment, salon) {
    const message = this.buildReminderMessage(appointment, salon, 24);
    
    const results = { sms: null, email: null };

    if (this.smsService && appointment.client_phone) {
      try {
        results.sms = await this.smsService.send(appointment.client_phone, message);
      } catch (err) {
        console.error(`SMS failed for ${appointment.id}:`, err.message);
      }
    }

    if (appointment.client_email) {
      try {
        results.email = await this.emailService.send({
          to: appointment.client_email,
          subject: `Reminder: Appointment at ${salon.name} tomorrow`,
          text: message
        });
      } catch (err) {
        console.error(`Email failed for ${appointment.id}:`, err.message);
      }
    }

    update('appointments', appointment.id, { reminder_24h_sent: 1 });

    return results;
  }

  /**
   * Send 6hr reminder (final warning - unconfirmed)
   */
  async send6hReminder(appointment, salon) {
    const scheduledDate = new Date(appointment.scheduled_at);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });

    let message = `⚠️ Hi ${appointment.client_name}, your appointment at ${salon.name} is in 6 hours (${formattedDate} at ${formattedTime}). Reply YES to confirm or NO to cancel.`;

    const results = { sms: null, email: null };

    if (this.smsService && appointment.client_phone) {
      try {
        results.sms = await this.smsService.send(appointment.client_phone, message);
      } catch (err) {
        console.error(`SMS failed for ${appointment.id}:`, err.message);
      }
    }

    update('appointments', appointment.id, { reminder_6h_sent: 1 });

    return results;
  }

  /**
   * Build reminder message
   */
  buildReminderMessage(appointment, salon, hoursUntil) {
    const scheduledDate = new Date(appointment.scheduled_at);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
    const formattedTime = scheduledDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });

    const serviceText = appointment.service ? ` for ${appointment.service}` : '';

    return `Hi ${appointment.client_name},

Just a reminder: you have an appointment${serviceText} at ${salon.name} on ${formattedDate} at ${formattedTime}.

Please reply YES to confirm or NO to cancel so we can offer your slot to someone else if needed.

Thanks!`;
  }

  /**
   * Process all pending reminders
   */
  async processReminders() {
    const results = {
      sent_48h: 0,
      sent_24h: 0,
      sent_6h: 0,
      errors: []
    };

    // 48hr reminders
    try {
      const appts48h = AppointmentModel.findNeeding48hReminder();
      for (const appt of appts48h) {
        try {
          await this.send48hReminder(appt, { name: appt.salon_name, phone: appt.salon_phone });
          results.sent_48h++;
        } catch (err) {
          results.errors.push({ id: appt.id, error: err.message });
        }
      }
    } catch (err) {
      console.error('48h reminder query failed:', err.message);
    }

    // 24hr reminders
    try {
      const appts24h = AppointmentModel.findNeeding24hReminder();
      for (const appt of appts24h) {
        try {
          await this.send24hReminder(appt, { name: appt.salon_name, phone: appt.salon_phone });
          results.sent_24h++;
        } catch (err) {
          results.errors.push({ id: appt.id, error: err.message });
        }
      }
    } catch (err) {
      console.error('24h reminder query failed:', err.message);
    }

    // 6hr reminders
    try {
      const appts6h = AppointmentModel.findNeeding6hReminder();
      for (const appt of appts6h) {
        try {
          await this.send6hReminder(appt, { name: appt.salon_name, phone: appt.salon_phone });
          results.sent_6h++;
        } catch (err) {
          results.errors.push({ id: appt.id, error: err.message });
        }
      }
    } catch (err) {
      console.error('6h reminder query failed:', err.message);
    }

    return results;
  }
}

export default ReminderService;
