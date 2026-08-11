import assert from 'node:assert/strict';
import test from 'node:test';

import { POSTER_TEMPLATES } from './questionInvitePosterTemplates.js';


test('邀请答题提供五款互不重复的海报模板', () => {
  assert.equal(POSTER_TEMPLATES.length, 5);
  assert.equal(new Set(POSTER_TEMPLATES.map((template) => template.id)).size, 5);
  assert.equal(new Set(POSTER_TEMPLATES.map((template) => template.name)).size, 5);
  POSTER_TEMPLATES.forEach((template) => {
    assert.ok(template.caption);
    assert.ok(template.swatch);
  });
});
