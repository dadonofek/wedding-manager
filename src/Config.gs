/**
 * Config.gs — central configuration.
 *
 * Edit the values below. Secrets (WhatsApp token + phone number id) are NOT
 * stored here — they live in Script Properties so they never end up in your
 * git repo. See Setup.gs > setSecrets().
 */

const CONFIG = {
  // Tab names inside your Google Sheet
  SHEETS: {
    GUESTS: 'Guests',
    BUDGET: 'Budget',
  },

  // WhatsApp Cloud API (official Meta API)
  WHATSAPP: {
    API_VERSION: 'v21.0',
    TEMPLATE_LANG: 'he', // Hebrew templates
    TEMPLATES: {
      INVITE: 'wedding_invite',
      REMINDER: 'wedding_reminder',
      DAY_BEFORE: 'wedding_day_before',
    },
  },

  // Public URL of your deployed RSVP web app.
  // Fill this in AFTER you deploy: Deploy > New deployment > Web app, copy the
  // /exec URL here, then re-deploy if you change it.
  RSVP_BASE_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',

  // Wedding details — used in messages and on the RSVP form
  WEDDING: {
    COUPLE: 'דנה ויוסי',                 // edit
    DATE_ISO: '2026-09-10',               // YYYY-MM-DD
    TIME: '19:00',                        // edit
    VENUE: 'אולמי הגן, תל אביב',          // edit
    MAP_URL: 'https://maps.google.com/?q=', // edit
  },

  // Reminder behaviour
  REMINDERS: {
    MAX_PER_GUEST: 2, // max reminders (not counting the original invite)
    SEND_HOUR: 9,     // local hour (Asia/Jerusalem) for the daily batch
  },
};

// Status values used in the Guests sheet "status" column
const STATUS = {
  PENDING: 'PENDING',     // not yet invited
  SENT: 'SENT',           // invite sent, awaiting reply
  CONFIRMED: 'CONFIRMED', // coming
  DECLINED: 'DECLINED',   // not coming
};
