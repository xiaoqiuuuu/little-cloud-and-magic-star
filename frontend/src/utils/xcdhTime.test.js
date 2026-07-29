import assert from 'node:assert/strict';
import test from 'node:test';
import { formatXcdhCreatedAt } from './xcdhTime.js';

test('formats SQLite UTC timestamps as China Standard Time', () => {
  assert.equal(formatXcdhCreatedAt('2026-07-29 05:30:00'), '2026-07-29 13:30');
  assert.equal(formatXcdhCreatedAt('2026-07-29T05:30:00Z'), '2026-07-29 13:30');
});

test('returns an empty label for missing or invalid timestamps', () => {
  assert.equal(formatXcdhCreatedAt(null), '');
  assert.equal(formatXcdhCreatedAt('not-a-time'), '');
});
