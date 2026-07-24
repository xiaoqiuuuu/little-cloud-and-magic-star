import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PERMISSIONS,
  canAccessBackend,
  getDefaultAccessPath,
  hasContentAdminAccess,
  hasPermission,
  hasRole,
} from './adminAccess.js';


test('permission helpers use explicit RBAC permissions', () => {
  const questionManager = { permissions: [PERMISSIONS.QUESTIONS_MANAGE] };
  const materialManager = { permissions: [PERMISSIONS.MATERIALS_MANAGE] };
  const quizOperator = { permissions: [PERMISSIONS.QUIZ_OPERATE] };

  assert.equal(hasPermission(questionManager, PERMISSIONS.QUESTIONS_MANAGE), true);
  assert.equal(hasContentAdminAccess(questionManager), true);
  assert.equal(canAccessBackend(questionManager), true);
  assert.equal(canAccessBackend(materialManager), true);
  assert.equal(canAccessBackend(quizOperator), false);
  assert.equal(hasContentAdminAccess(null), false);
});


test('role helpers support multiple roles and legacy single-role users', () => {
  assert.equal(
    hasRole({ role_keys: ['question_admin', 'quiz_operator'] }, 'quiz_operator'),
    true,
  );
  assert.equal(
    hasRole({ roles: [{ key: 'question_admin' }, { key: 'quiz_operator' }] }, 'super_admin'),
    false,
  );
  assert.equal(hasRole({ role: 'super_admin' }, 'super_admin'), true);
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
    getDefaultAccessPath({ permissions: [PERMISSIONS.MATERIALS_MANAGE] }),
    '/admin/materials',
  );
  assert.equal(
    getDefaultAccessPath({ permissions: [PERMISSIONS.QUIZ_ACTIVITIES_MANAGE] }),
    '/admin/activities',
  );
  assert.equal(
    getDefaultAccessPath({ permissions: [PERMISSIONS.VISIT_STATS_VIEW] }),
    '/admin/stats',
  );
  assert.equal(
    getDefaultAccessPath({ permissions: [PERMISSIONS.QUIZ_OPERATE] }),
    '/quiz',
  );
  assert.equal(getDefaultAccessPath({ permissions: [] }), '/admin/login');
});
