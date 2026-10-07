import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { ENQUIRY_STATUSES } from '../config.js';
import { present } from './public.js';

// Writable columns per content table (body keys are camelCase, columns snake_case).
const TABLES = {
  services: ['title', 'summary', 'deliverables', 'duration', 'price_from', 'price_note', 'sort_order', 'published'],
  work: ['slug', 'title', 'area', 'began', 'the_read', 'i_made', 'changed', 'quote', 'quote_attribution', 'images', 'sort_order', 'published'],
  playground: ['title', 'description', 'color_from', 'color_to', 'image', 'link', 'sort_order', 'published'],
};
const TABLE_NAMES = { services: 'services', work: 'case_studies', playground: 'playground' };
const REQUIRED = { services: ['title'], work: ['slug', 'title'], playground: ['title'] };

const snake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

const toColumns = (body, allowed) => {
  const out = {};
  for (const [key, value] of Object.entries(body ?? {})) {
    const col = snake(key);
    if (!allowed.includes(col)) continue;
    if (col === 'published') out[col] = value ? 1 : 0;
    else if (col === 'images') out[col] = JSON.stringify(Array.isArray(value) ? value.map(String) : []);
    else if (col === 'price_from' || col === 'sort_order') out[col] = value === null || value === '' ? null : Number(value);
    else out[col] = String(value ?? '');
  }
  return out;
};

export function requireAdmin(token) {
  const expected = Buffer.from(token);
  return (req, res, next) => {
    // No token configured means the admin API stays switched off.
    if (!token) return res.status(503).json({ error: 'Admin API disabled: set ADMIN_TOKEN.' });
    const given = Buffer.from((req.get('authorization') || '').replace(/^Bearer /, ''));
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };
}

export function adminRoutes({ db, adminToken }) {
  const router = Router();
  router.use(requireAdmin(adminToken));

  // ---- Enquiries inbox
  router.get('/enquiries', (req, res) => {
    const { status } = req.query;
    const rows = status
      ? db.prepare('SELECT * FROM enquiries WHERE status = ? ORDER BY id DESC').all(String(status))
      : db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all();
    res.json({ items: rows.map(present) });
  });

  router.patch('/enquiries/:id', (req, res) => {
    const { status } = req.body ?? {};
    if (!ENQUIRY_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${ENQUIRY_STATUSES.join(', ')}` });
    }
    const { changes } = db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, req.params.id);
    changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
  });

  router.delete('/enquiries/:id', (req, res) => {
    const { changes } = db.prepare('DELETE FROM enquiries WHERE id = ?').run(req.params.id);
    changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
  });

  // ---- Content CRUD: services, work, playground (includes unpublished rows)
  for (const [route, allowed] of Object.entries(TABLES)) {
    const table = TABLE_NAMES[route];

    router.get(`/${route}`, (_req, res) => {
      res.json({ items: db.prepare(`SELECT * FROM ${table} ORDER BY sort_order, id`).all().map(present) });
    });

    router.post(`/${route}`, (req, res) => {
      const cols = toColumns(req.body, allowed);
      const missing = REQUIRED[route].filter((c) => !cols[c]);
      if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(', ')}` });
      const names = Object.keys(cols);
      try {
        const { lastInsertRowid } = db
          .prepare(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`)
          .run(...Object.values(cols));
        res.status(201).json(present(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(lastInsertRowid)));
      } catch (err) {
        res.status(409).json({ error: err.message });
      }
    });

    router.put(`/${route}/:id`, (req, res) => {
      const cols = toColumns(req.body, allowed);
      const names = Object.keys(cols);
      if (!names.length) return res.status(400).json({ error: 'Nothing to update' });
      try {
        const { changes } = db
          .prepare(`UPDATE ${table} SET ${names.map((n) => `${n} = ?`).join(', ')} WHERE id = ?`)
          .run(...Object.values(cols), req.params.id);
        if (!changes) return res.status(404).json({ error: 'Not found' });
        res.json(present(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id)));
      } catch (err) {
        res.status(409).json({ error: err.message });
      }
    });

    router.delete(`/${route}/:id`, (req, res) => {
      const { changes } = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
      changes ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
    });
  }

  return router;
}
