import assert from 'node:assert/strict';
import test from 'node:test';

import { hasContentAdminAccess } from './adminAccess.js';


test('content admin access only allows management roles', () => {
  assert.equal(hasContentAdminAccess({ role: 'super_admin' }), true);
  assert.equal(hasContentAdminAccess({ role: 'question_admin' }), true);
  assert.equal(hasContentAdminAccess({ role: 'quiz_operator' }), false);
  assert.equal(hasContentAdminAccess(null), false);
});
