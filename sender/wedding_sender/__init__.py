"""wedding_sender — WhatsApp Desktop bulk sender for wedding invites + RSVP links.

The Google Sheet exports a CSV (id,name,phone,link,kind); this package sends
one personalized message per row through the WhatsApp Desktop app on macOS
and records every send in sent_log.csv, which is imported back into the Sheet.
"""
