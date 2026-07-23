import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PERMISSIONS,
  canAccessBackend,
  getDefaultAccessPath,
  hasContentAdminAccess,
  hasPermission,
} from './adminAccess.js';


test('permission helpers use explicit RBAC permissions', () => {
  const questionManager = { permissions: [PERMISSIONS.QUESTIONS_MANAGE] };
  const quizOperator = { permissions: [PERMISSIONS.QUIZ_OPERATE] };

  assert.equal(hasPermission(questionManager, PERMISSIONS.QUESTIONS_MANAGE), true);
  assert.equal(hasContentAdminAccess(questionManager), true);
  assert.equal(canAccessBackend(questionManager), true);
  assert.equal(canAccessBackend(quizOperator), false);
  assert.equal(hasContentAdminAccess(null), false);
});


test('default access path follows permission priority', () => {
  assert.equal(
    getDefaultAccessPath({ permissions: [PERMISSIONS.ACCOUNTS_MANAGE] }),
    '/admin/users',
  );
  assert.equal(
    getDefaultAccessPath({ permissions: [PERMISSIONS.HOMEPAGE_MANAGE] }),
    '/admin/site-events',
  );
  assert.equal(
    getDefaultAccessPath({ permissions: [PERMISSIONS.QUIZ_OPERATE] }),
    '/quiz',
  );
  assert.equal(getDefaultAccessPath({ permissions: [] }), '/admin/login');
});
