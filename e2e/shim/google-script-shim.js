/**
 * Browser shim for the Apps Script client API used by RsvpForm.html.
 * Emulates google.script.run.withSuccessHandler(...).submitRsvp(data).
 *
 * Test hooks:
 *   window.__shimMode  'ok' (default) | 'server-error' | 'failure'
 *   window.__rsvpCalls array of submitRsvp payloads received
 */
(function () {
  window.__rsvpCalls = [];
  window.__shimMode = window.__shimMode || 'ok';

  function makeRunner(handlers) {
    return {
      withSuccessHandler: function (fn) {
        return makeRunner({ success: fn, failure: handlers.failure });
      },
      withFailureHandler: function (fn) {
        return makeRunner({ success: handlers.success, failure: fn });
      },
      submitRsvp: function (data) {
        window.__rsvpCalls.push(data);
        setTimeout(function () {
          var mode = window.__shimMode;
          if (mode === 'failure') {
            if (handlers.failure) handlers.failure(new Error('network'));
            return;
          }
          if (mode === 'server-error') {
            if (handlers.success) handlers.success({ ok: false, error: 'not_found' });
            return;
          }
          // Mirrors Rsvp.gs submitRsvp: attending > 0 → CONFIRMED else DECLINED
          var status = Number(data.attending) > 0 ? 'CONFIRMED' : 'DECLINED';
          if (handlers.success) handlers.success({ ok: true, status: status });
        }, 120);
      },
    };
  }

  window.google = { script: { run: makeRunner({}) } };
})();
