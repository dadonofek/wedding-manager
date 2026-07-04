/**
 * Rsvp.gs — serves the RSVP form (doGet) and records responses (submitRsvp).
 *
 * Deploy: Deploy > New deployment > type "Web app",
 *   Execute as: Me,  Who has access: Anyone.
 * Copy the /exec URL into Config.gs > RSVP_BASE_URL.
 */

function doGet(e) {
  const token = e && e.parameter ? e.parameter.token : '';
  const guest = token ? getGuestById_(token) : null;

  const t = HtmlService.createTemplateFromFile('RsvpForm');
  t.guest = guest ? {
    id: guest.id,
    name: guest.name,
    maxGuests: Number(guest.max_guests) || 1,
  } : null;
  t.wedding = CONFIG.WEDDING;

  return t.evaluate()
    .setTitle('אישור הגעה')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Called from the form via google.script.run.
 * @param {{token:string, attending:(string|number), dietary:string}} data
 */
function submitRsvp(data) {
  const guest = getGuestById_(data.token);
  if (!guest) return { ok: false, error: 'not_found' };

  const sh = guestsSheet_();
  const attending = Number(data.attending);
  const status = attending > 0 ? STATUS.CONFIRMED : STATUS.DECLINED;

  sh.getRange(guest._row, COL.status).setValue(status);
  sh.getRange(guest._row, COL.attending_count).setValue(attending);
  if (data.dietary) sh.getRange(guest._row, COL.dietary).setValue(data.dietary);
  sh.getRange(guest._row, COL.rsvp_at).setValue(new Date());

  return { ok: true, status: status };
}
