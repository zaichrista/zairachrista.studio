# zairachrista.studio

Portfolio website plus a small Node backend (Express + SQLite).

```
public/          the website (served as-is)
  *.html, css/, js/, assets/{icons,brand,images}/
server/          the backend
  routes/        public.js (enquiries + content), admin.js (inbox + content editing)
  db.js          SQLite schema      seed.js  starter content
  mailer.js      optional SMTP emails
data/            SQLite file lives here (git-ignored)
test/            npm test
docs/            website-copy.md, plus copy-drafts/ (older copy versions)
source-media/    original screen recordings and screenshots (not served)
archive/         old loader drafts and work2-images, kept out of the way
```

## Run it

```bash
npm install
cp .env.example .env     # set ADMIN_TOKEN, optionally SMTP_*
npm run dev              # http://localhost:3000
```

Requires Node 22.13 or newer. The database is created and seeded (services and playground) on first start.

## API

Public:
- `GET /api/services`, `/api/work`, `/api/work/:slug`, `/api/playground`: published rows only
- `POST /api/enquiries`: `{ name, email, message, venue?, interest?, findMe?, findMeOther? }`. Returns 201 `{ ok: true }` or 400 `{ ok: false, errors }`. Honeypot field `companyWebsite`; 3 per email and 10 per IP per 10 minutes.

Admin (header `Authorization: Bearer <ADMIN_TOKEN>`; switched off if no token is set):
- `GET /api/admin/enquiries[?status=New]`, `PATCH /api/admin/enquiries/:id` `{ status }`, `DELETE ...`
- `GET | POST /api/admin/{services,work,playground}`, `PUT | DELETE /api/admin/{...}/:id`. Include unpublished rows, and rows only show publicly once `published` is true.

Example, adding a case study:

```bash
curl -X POST localhost:3000/api/admin/work -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"slug":"the-room","title":"The Room","area":"Notting Hill","published":true}'
```

## Deploying

Any host that runs Node (Render, Railway, Fly.io, a VPS). Set the env vars from `.env.example`; keep `data/` on a persistent disk or change `DATABASE_PATH`. Put it behind HTTPS.

## Wix

A Node server can't run inside Wix. If the site ends up on Wix, either keep this as the API (set `CORS_ORIGINS` to the Wix domain and call the endpoints from Wix page code with `fetch`), or use Wix Forms and the Wix CMS instead and retire this server.
