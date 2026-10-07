import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { createMailer } from './mailer.js';
import { createApp } from './app.js';
import { seedIfEmpty } from './seed.js';

const config = loadConfig();
const db = openDb(config.databasePath);
seedIfEmpty(db);

const app = createApp({ db, mailer: createMailer(config.mail), config });
app.listen(config.port, () => {
  console.log(`zairachrista.studio running on http://localhost:${config.port}`);
  if (!config.adminToken) console.log('ADMIN_TOKEN not set: /api/admin is disabled.');
  if (!config.mail.host) console.log('SMTP not configured: enquiry emails are skipped.');
});
