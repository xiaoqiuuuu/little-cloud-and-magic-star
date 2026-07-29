import assert from 'node:assert/strict';
import test from 'node:test';
import { getWishDiscoveryTheme, searchXcdhMessages } from './xcdhWishes.js';

const messages = [
  { id: 12, username: '星海旅人', content: '愿黄霄雲站上更大的舞台', click_count: 8 },
  { id: 21, username: '云朵', content: '一起奔赴星辰大海', click_count: 31 },
  { id: 31, username: '小星星', content: '星海永远闪耀', click_count: 2 },
];

test('wish search matches id, nickname, and content', () => {
  assert.equal(searchXcdhMessages(messages, '#21')[0].id, 21);
  assert.equal(searchXcdhMessages(messages, '星海旅人')[0].id, 12);
  assert.deepEqual(searchXcdhMessages(messages, '星海').map(({ id }) => id), [12, 31]);
});

test('wish search prefers exact matches and limits results', () => {
  assert.equal(searchXcdhMessages(messages, '小星星')[0].id, 31);
  assert.deepEqual(searchXcdhMessages(messages, '#'), []);
  const results = searchXcdhMessages(messages, '星', 2);
  assert.equal(results.length, 2);
  assert.deepEqual(results.map(({ id }) => id), [12, 31]);
});

test('wish discovery themes become warmer as visits increase', () => {
  assert.equal(getWishDiscoveryTheme(0), 'new');
  assert.equal(getWishDiscoveryTheme(3), 'glowing');
  assert.equal(getWishDiscoveryTheme(10), 'radiant');
  assert.equal(getWishDiscoveryTheme(30), 'legendary');
});
