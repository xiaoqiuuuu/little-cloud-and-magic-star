import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const stylesheet = await readFile(new URL('../pages/XcdhPage.css', import.meta.url), 'utf8');

const getRule = (selector) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = stylesheet.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 's'));
  assert.ok(match, `Missing CSS rule for ${selector}`);
  return match[1];
};

test('wish popup lets users click stars behind it while keeping close interactive', () => {
  assert.match(getRule('.xcdh-wish-popup'), /pointer-events:\s*none\s*;/);
  assert.match(getRule('.xcdh-wish-popup__close'), /pointer-events:\s*auto\s*;/);
});
