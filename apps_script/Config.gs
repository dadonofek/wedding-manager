/**
 * Config.gs — central configuration.
 *
 * Edit the values below. There are no secrets here: WhatsApp messages are
 * sent from your own Mac via the WhatsApp Desktop app (see docs/SENDING.md),
 * so this project needs no API credentials at all.
 */

const CONFIG = {
  // Tab names inside your Google Sheet
  SHEETS: {
    GUESTS: 'Guests',
    BUDGET: 'Budget',
  },

  // Public URL of your deployed RSVP web app.
  // Fill this in AFTER you deploy: Deploy > New deployment > Web app, copy the
  // /exec URL here, then re-deploy if you change it.
  RSVP_BASE_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',

  // Wedding details — used in messages and on the RSVP form
  WEDDING: {
    COUPLE: 'שרון ושגיא',
    DATE_ISO: '2026-08-20',               // YYYY-MM-DD
    TIME: '12:00',
    VENUE: 'חוות אדמה ושמים, יבניאל',
    MAP_URL: 'נסיעה עם Waze אל חוות אדמה ושמים, יבנאל: https://waze.com/ul/hsvc601svr',
  },

  // Reminder behaviour — used as an export filter (see Export.gs):
  // guests who already got this many reminders are left out of the
  // "export reminders" CSV.
  REMINDERS: {
    MAX_PER_GUEST: 2, // max reminders (not counting the original invite)
  },
};

// Status values used in the Guests sheet "status" column
const STATUS = {
  PENDING: 'PENDING',     // not yet invited
  SENT: 'SENT',           // invite sent, awaiting reply
  CONFIRMED: 'CONFIRMED', // coming
  DECLINED: 'DECLINED',   // not coming
};
