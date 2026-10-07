import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnquiry } from '../server/validation.js';

const good = {
  name: ' Ada Lovelace ',
  email: 'ADA@Example.com',
  message: 'Tell me about the room.',
  interest: 'Website Build',
};

test('accepts a valid enquiry and normalises it', () => {
  const r = validateEnquiry(good);
  assert.equal(r.ok, true);
  assert.equal(r.value.name, 'Ada Lovelace');
  assert.equal(r.value.email, 'ada@example.com');
});

test('defaults interest to "Not sure"', () => {
  assert.equal(validateEnquiry({ ...good, interest: '' }).value.interest, 'Not sure');
});

test('rejects missing required fields', () => {
  const r = validateEnquiry({});
  assert.deepEqual(Object.keys(r.errors).sort(), ['email', 'message', 'name']);
});

test('rejects bad email and unknown dropdown values', () => {
  const r = validateEnquiry({ ...good, email: 'nope', interest: 'Free stuff', findMe: 'TikTok' });
  assert.deepEqual(Object.keys(r.errors).sort(), ['email', 'findMe', 'interest']);
});

test('flags honeypot as spam', () => {
  assert.equal(validateEnquiry({ ...good, companyWebsite: 'http://spam.example' }).spam, true);
});

test('truncates oversized input and strips control characters', () => {
  const r = validateEnquiry({ ...good, message: 'a\u0000b'.repeat(5000) });
  assert.equal(r.value.message.length, 3000);
  assert.ok(!r.value.message.includes('\u0000'));
});
