import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';
import { loadConfig } from '../server/config.js';
import { seedIfEmpty } from '../server/seed.js';

const TOKEN = 'test-token';
let server, base, db;
const sent = [];

before(async () => {
  db = openDb(':memory:');
  seedIfEmpty(db);
  const config = { ...loadConfig({}), adminToken: TOKEN };
  const mailer = { sendEnquiry: async (e) => void sent.push(e) };
  server = createApp({ db, mailer, config }).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (path, body, headers = {}) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
const admin = { Authorization: `Bearer ${TOKEN}` };
const enquiry = (over = {}) => ({
  name: 'Ada', email: 'ada@example.com', message: 'Hello', ...over,
});

test('serves seeded services and playground, hides unpublished', async () => {
  const services = await (await fetch(`${base}/api/services`)).json();
  assert.equal(services.items.length, 4);
  assert.equal(services.items[0].priceFrom, 2500);
  assert.equal((await (await fetch(`${base}/api/playground`)).json()).items.length, 6);
  assert.deepEqual((await (await fetch(`${base}/api/work`)).json()).items, []);
});

test('serves the static site', async () => {
  const res = await fetch(`${base}/contact.html`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /enquiry-form/);
});

test('stores a valid enquiry and sends email', async () => {
  const res = await post('/api/enquiries', enquiry({ interest: 'Website Build' }));
  assert.equal(res.status, 201);
  const rows = db.prepare('SELECT * FROM enquiries').all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'New');
  assert.equal(sent.length, 1);
});

test('rejects invalid enquiries with field errors', async () => {
  const res = await post('/api/enquiries', { name: '', email: 'x' });
  assert.equal(res.status, 400);
  assert.deepEqual(Object.keys((await res.json()).errors).sort(), ['email', 'message', 'name']);
});

test('honeypot gets fake success and stores nothing', async () => {
  const before = db.prepare('SELECT COUNT(*) AS n FROM enquiries').get().n;
  const res = await post('/api/enquiries', enquiry({ email: 'bot@example.com', companyWebsite: 'x' }));
  assert.equal((await res.json()).ok, true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM enquiries').get().n, before);
});

test('limits repeat enquiries per email', async () => {
  const email = 'repeat@example.com';
  const codes = [];
  for (let i = 0; i < 4; i++) codes.push((await post('/api/enquiries', enquiry({ email }))).status);
  assert.deepEqual(codes, [201, 201, 201, 429]);
});

test('admin API requires the token', async () => {
  assert.equal((await fetch(`${base}/api/admin/enquiries`)).status, 401);
  assert.equal(
    (await fetch(`${base}/api/admin/enquiries`, { headers: { Authorization: 'Bearer nope' } })).status,
    401,
  );
  const ok = await fetch(`${base}/api/admin/enquiries`, { headers: admin });
  assert.equal(ok.status, 200);
  assert.ok((await ok.json()).items.length >= 1);
});

test('admin can manage enquiry status', async () => {
  const { items } = await (await fetch(`${base}/api/admin/enquiries`, { headers: admin })).json();
  const patch = (status) =>
    fetch(`${base}/api/admin/enquiries/${items[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...admin },
      body: JSON.stringify({ status }),
    });
  assert.equal((await patch('Replied')).status, 200);
  assert.equal((await patch('Bogus')).status, 400);
});

test('admin can publish a case study that then appears publicly', async () => {
  const create = await post(
    '/api/admin/work',
    { slug: 'the-room', title: 'The Room', area: 'Notting Hill', images: ['/assets/images/a.jpg'], published: true },
    admin,
  );
  assert.equal(create.status, 201);
  const one = await (await fetch(`${base}/api/work/the-room`)).json();
  assert.equal(one.title, 'The Room');
  assert.deepEqual(one.images, ['/assets/images/a.jpg']);
  assert.equal((await post('/api/admin/work', { slug: 'the-room', title: 'Dup' }, admin)).status, 409);
});

test('unknown api routes return JSON 404', async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).error, 'Not found');
});
