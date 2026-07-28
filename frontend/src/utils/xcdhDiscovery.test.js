import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampUniverseOffset,
  isRectVisible,
  selectOffscreenMessage,
} from './xcdhDiscovery.js';

test('rectangle visibility uses the rendered viewport intersection', () => {
  const viewport = { left: 0, top: 0, right: 800, bottom: 600 };
  assert.equal(isRectVisible({ left: 20, top: 20, right: 60, bottom: 60 }, viewport), true);
  assert.equal(isRectVisible({ left: 810, top: 20, right: 850, bottom: 60 }, viewport), false);
  assert.equal(isRectVisible({ left: -50, top: 20, right: 10, bottom: 60 }, viewport), true);
});

test('focused universe offsets keep edge wishes inside the safe viewport area', () => {
  const bounds = {
    viewportWidth: 1200,
    viewportHeight: 800,
    worldWidth: 3000,
    worldHeight: 2000,
    overscan: 200,
  };

  assert.deepEqual(clampUniverseOffset({ x: 600, y: 400 }, bounds), { x: 200, y: 200 });
  assert.deepEqual(
    clampUniverseOffset({ x: -2400, y: -1600 }, bounds),
    { x: -2000, y: -1400 },
  );
});

test('new wish selection only returns an offscreen non-active message', () => {
  const messages = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const selected = selectOffscreenMessage(messages, new Set(['1']), 2, () => 0.99);
  assert.equal(selected.id, 3);
});

test('new wish selection returns null when every alternative is visible', () => {
  const messages = [{ id: 1 }, { id: 2 }];
  assert.equal(selectOffscreenMessage(messages, new Set(['1', '2']), 1), null);
});
