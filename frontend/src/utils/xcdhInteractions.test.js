import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const stylesheet = await readFile(new URL('../pages/XcdhPage.css', import.meta.url), 'utf8');
const pageSource = await readFile(new URL('../pages/XcdhPage.jsx', import.meta.url), 'utf8');

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

test('offscreen wish discovery records a visit after focus', () => {
  assert.match(pageSource, /if \(target\) focusMessage\(target, true\);/);
  assert.match(pageSource, /if \(!starElement\) return;/);
  assert.match(pageSource, /if \(!isRectFullyVisible\(starRect, viewportRect\)\) return;/);
  assert.match(
    pageSource,
    /if \(countDiscovery\) \{\s*void recordMessageDiscovery\(message\);\s*\}/,
  );
});

test('searched wishes record a visit after safe focus', () => {
  assert.match(
    pageSource,
    /<XcdhWishSearch[\s\S]*?onSelect=\{\(message\) => focusMessage\(message, true\)\}/,
  );
});

test('wish popup metadata is ordered by id, discoveries, and creation time', () => {
  assert.match(
    pageSource,
    /<div className="xcdh-wish-popup__meta">\s*<span>星愿 #\{message\.id\}<\/span>\s*<span>发现 \{message\.click_count \|\| 0\} 次<\/span>[\s\S]*?投递 \{createdAt\}/,
  );
  assert.match(getRule('.xcdh-wish-popup__meta'), /flex-wrap:\s*nowrap\s*;/);
});
