/**
 * WhatsApp.gs — official WhatsApp Cloud API sender.
 * Credentials are read from Script Properties (see Setup.gs > setSecrets).
 */

function waCreds_() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('WHATSAPP_TOKEN');
  const phoneId = props.getProperty('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneId) {
    throw new Error('Missing WhatsApp credentials. Run setSecrets() first.');
  }
  return { token: token, phoneId: phoneId };
}

/**
 * Send an approved template message.
 * @param {string}   phone        Recipient. "05X..." or "9725X..." both fine.
 * @param {string}   templateName Approved template name (e.g. wedding_invite).
 * @param {string[]} bodyParams   Ordered values for {{1}}, {{2}}, ... in the body.
 * @return {{ok:boolean, status:number, body:string}}
 */
function sendTemplate_(phone, templateName, bodyParams) {
  const creds = waCreds_();
  const url = 'https://graph.facebook.com/' + CONFIG.WHATSAPP.API_VERSION +
    '/' + creds.phoneId + '/messages';

  const components = [];
  if (bodyParams && bodyParams.length) {
    components.push({
      type: 'body',
      parameters: bodyParams.map(function (v) { return { type: 'text', text: String(v) }; }),
    });
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: normalizePhone_(phone),
    type: 'template',
    template: {
      name: templateName,
      language: { code: CONFIG.WHATSAPP.TEMPLATE_LANG },
      components: components,
    },
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { Authorization: 'Bearer ' + creds.token },
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  return { ok: code >= 200 && code < 300, status: code, body: res.getContentText() };
}

/**
 * Normalize to international digits. Israeli local numbers (05X...) become
 * 9725X.... Strips +, spaces and dashes.
 */
function normalizePhone_(phone) {
  var p = String(phone).replace(/[^\d]/g, '');
  if (p.indexOf('0') === 0) p = '972' + p.slice(1);
  return p;
}

/** One-off tester: sends an invite to the first guest. Edit/run manually. */
function testSendFirstGuest() {
  const g = getGuests_()[0];
  if (!g) { Logger.log('No guests.'); return; }
  const res = sendTemplate_(g.phone, CONFIG.WHATSAPP.TEMPLATES.INVITE,
    [String(g.name), rsvpLink_(g)]);
  Logger.log(JSON.stringify(res, null, 2));
}
