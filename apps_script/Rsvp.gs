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

  // responded → the form opens pre-filled with the previous answer so the
  // guest can review/update it (attending is -1 when there is no answer yet).
  const responded = !!guest &&
    (guest.status === STATUS.CONFIRMED || guest.status === STATUS.DECLINED);

  const t = HtmlService.createTemplateFromFile('RsvpForm');
  t.guest = guest ? {
    id: guest.id,
    name: guest.name,
    responded: responded,
    attending: responded ? Number(guest.attending_count) || 0 : -1,
    dietary: guest.dietary ? String(guest.dietary) : '',
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
  // Always write dietary so a guest updating their answer can also clear it.
  sh.getRange(guest._row, COL.dietary).setValue(data.dietary || '');
  sh.getRange(guest._row, COL.rsvp_at).setValue(new Date());

  return { ok: true, status: status };
}
