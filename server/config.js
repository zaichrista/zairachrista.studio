export const INTEREST_OPTIONS = [
  'Venue Relaunch',
  'Website Build',
  'Monthly Partner',
  'Venue Diagnosis',
  'Project work',
  'Not sure',
];

export const FIND_OPTIONS = ['Website', 'Instagram', 'Other'];

export const ENQUIRY_STATUSES = ['New', 'Replied', 'In progress', 'Closed'];

export const loadConfig = (env = process.env) => ({
  port: Number(env.PORT) || 3000,
  adminToken: env.ADMIN_TOKEN || '',
  databasePath: env.DATABASE_PATH || 'data/studio.db',
  corsOrigins: (env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  mail: {
    host: env.SMTP_HOST || '',
    port: Number(env.SMTP_PORT) || 587,
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || 'hello@zairachrista.studio',
    notifyTo: env.NOTIFY_TO || 'hello@zairachrista.studio',
  },
});
