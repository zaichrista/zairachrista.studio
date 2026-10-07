import { INTEREST_OPTIONS, FIND_OPTIONS } from './config.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const clean = (value, max) =>
  String(value ?? '').replace(CONTROL_CHARS, '').trim().slice(0, max);

/**
 * Validates and normalises an enquiry payload.
 * Returns { ok: true, value } or { ok: false, errors }.
 * A filled honeypot returns { ok: false, spam: true } so the caller can fake success.
 */
export function validateEnquiry(input = {}) {
  if (clean(input.companyWebsite, 200)) return { ok: false, spam: true, errors: {} };

  const value = {
    name: clean(input.name, 100),
    venue: clean(input.venue, 150),
    email: clean(input.email, 254).toLowerCase(),
    interest: clean(input.interest, 50),
    message: clean(input.message, 3000),
    findMe: clean(input.findMe, 50),
    findMeOther: clean(input.findMeOther, 200),
  };

  const errors = {};
  if (!value.name) errors.name = 'Please tell me your name.';
  if (!EMAIL_RE.test(value.email)) errors.email = 'Please enter a valid email address.';
  if (!value.message) errors.message = 'A few lines about your room is enough.';
  if (value.interest && !INTEREST_OPTIONS.includes(value.interest)) {
    errors.interest = 'Please choose one of the listed options.';
  }
  if (value.findMe && !FIND_OPTIONS.includes(value.findMe)) {
    errors.findMe = 'Please choose one of the listed options.';
  }
  if (!value.interest) value.interest = 'Not sure';
  if (value.findMe === 'Other' && value.findMeOther) value.findMe = `Other: ${value.findMeOther}`;
  delete value.findMeOther;

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}
