// Starting content from docs/website-copy.md. Only fills tables that are empty.
// Run directly with `npm run seed`, or automatically on first server start.
import { fileURLToPath } from 'node:url';

const SERVICES = [
  ['Venue Relaunch', 'Brand, Instagram, a month of content, print.', 'Audience reading, The Gap, brand direction, Instagram refresh, first month of content, menu and print', '6 weeks', 2500, 'From'],
  ['Website Build', 'Site, copy, photography direction.', 'Audience reading, site structure, written copy, photography direction, design and build, booking and menu setup, handover', '4 to 6 weeks', 2000, 'From'],
  ['Monthly Partner', 'Content, upkeep, review.', 'Content plan, posts, captions, stories, site upkeep, monthly review, hours agreed in writing', 'Monthly', 900, 'From, per month'],
  ['Venue Diagnosis', 'Not sure where to start?', 'Discovery conversation, audience reading, neighbourhood map, brand and journey audit, The Gap, findings call', '2 weeks', 400, 'From. Credited against any package within 30 days'],
];

const PLAYGROUND = [
  ['Experiment One', '#d9cfc3', '#a89a8a'],
  ['Experiment Two', '#2a2622', '#6b5b4e'],
  ['Experiment Three', '#c9d1d6', '#7d8f99'],
  ['Experiment Four', '#e4c9b5', '#b8774f'],
  ['Experiment Five', '#3a3f36', '#8a9378'],
  ['Experiment Six', '#ece6dc', '#c2b8a6'],
];

const isEmpty = (db, table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n === 0;

export function seedIfEmpty(db) {
  if (isEmpty(db, 'services')) {
    const stmt = db.prepare(
      'INSERT INTO services (title, summary, deliverables, duration, price_from, price_note, sort_order) VALUES (?,?,?,?,?,?,?)',
    );
    SERVICES.forEach((row, i) => stmt.run(...row, i + 1));
  }
  if (isEmpty(db, 'playground')) {
    const stmt = db.prepare(
      'INSERT INTO playground (title, description, color_from, color_to, sort_order) VALUES (?,?,?,?,?)',
    );
    PLAYGROUND.forEach(([title, a, b], i) => stmt.run(title, 'Short description', a, b, i + 1));
  }
  // Case studies are not seeded: add real ones through POST /api/admin/work.
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { loadConfig } = await import('./config.js');
  const { openDb } = await import('./db.js');
  const db = openDb(loadConfig().databasePath);
  seedIfEmpty(db);
  console.log('Seed complete.');
}
