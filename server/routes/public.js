import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateEnquiry } from '../validation.js';

const camel = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v]),
  );

const present = (row) => {
  const out = camel(row);
  out.published = Boolean(out.published);
  if (typeof out.images === 'string') out.images = JSON.parse(out.images);
  return out;
};

export function publicRoutes({ db, mailer }) {
  const router = Router();

  const list = (table) => (_req, res) => {
    const rows = db
      .prepare(`SELECT * FROM ${table} WHERE published = 1 ORDER BY sort_order, id`)
      .all();
    res.json({ items: rows.map(present) });
  };

  router.get('/services', list('services'));
  router.get('/work', list('case_studies'));
  router.get('/playground', list('playground'));

  router.get('/work/:slug', (req, res) => {
    const row = db
      .prepare('SELECT * FROM case_studies WHERE slug = ? AND published = 1')
      .get(req.params.slug);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(present(row));
  });

  // Burst limit per IP, on top of the per-email limit below.
  const ipLimit = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ ok: false, errors: { form: 'Too many messages. Please try again shortly.' } }),
  });

  router.post('/enquiries', ipLimit, (req, res) => {
    const result = validateEnquiry(req.body);
    if (result.spam) return res.json({ ok: true }); // bots learn nothing
    if (!result.ok) return res.status(400).json({ ok: false, errors: result.errors });

    const e = result.value;
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { n } = db
      .prepare('SELECT COUNT(*) AS n FROM enquiries WHERE email = ? AND created_at >= ?')
      .get(e.email, since);
    if (n >= 3) {
      return res
        .status(429)
        .json({ ok: false, errors: { form: 'Too many messages. Please try again shortly.' } });
    }

    db.prepare(
      'INSERT INTO enquiries (name, venue, email, interest, message, find_me) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(e.name, e.venue, e.email, e.interest, e.message, e.findMe);

    // Email is best-effort: the enquiry is already saved.
    mailer.sendEnquiry(e).catch((err) => console.error('Enquiry email failed:', err.message));

    res.status(201).json({ ok: true });
  });

  return router;
}

export { present };
