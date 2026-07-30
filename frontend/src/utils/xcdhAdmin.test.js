import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../App.jsx', import.meta.url), 'utf8');
const layoutSource = await readFile(new URL('../components/AdminLayout.jsx', import.meta.url), 'utf8');
const managerSource = await readFile(new URL('../pages/XcdhMessageManager.jsx', import.meta.url), 'utf8');

test('xcdh management is protected by its own permission and appears in navigation', () => {
  assert.match(appSource, /path="xcdh-messages"[\s\S]*?PERMISSIONS\.XCDH_MESSAGES_MANAGE/);
  assert.match(layoutSource, /<Link to="\/admin\/xcdh-messages">星愿<\/Link>/);
});

test('xcdh management supports search, visibility moderation, and permanent deletion', () => {
  assert.match(managerSource, /搜索星愿 ID、昵称或内容/);
  assert.match(managerSource, /\/visibility`, \{ hidden \}/);
  assert.match(managerSource, /api\.delete\(`\/admin\/xcdh\/messages\/\$\{record\.id\}`\)/);
});
