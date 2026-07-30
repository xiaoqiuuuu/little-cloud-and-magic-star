import assert from 'node:assert/strict';
import test from 'node:test';
import { createBackgroundStars, createMeteors } from './xcdhScene.js';

const scene = { worldWidth: 3000, worldHeight: 2000, overscan: 720 };

const assertFullCanvasCoverage = (items) => {
  assert.ok(Math.min(...items.map(({ x }) => x)) < 0);
  assert.ok(Math.max(...items.map(({ x }) => x)) > scene.worldWidth);
  assert.ok(Math.min(...items.map(({ y }) => y)) < 0);
  assert.ok(Math.max(...items.map(({ y }) => y)) > scene.worldHeight);
  items.forEach(({ x, y }) => {
    assert.ok(x >= -scene.overscan && x <= scene.worldWidth + scene.overscan);
    assert.ok(y >= -scene.overscan && y <= scene.worldHeight + scene.overscan);
  });
};

test('background stars cover the world and every overscan edge', () => {
  const stars = createBackgroundStars(scene);
  assert.equal(stars.length, 360);
  assert.equal(stars.filter(({ twinkles }) => twinkles).length, 90);
  assertFullCanvasCoverage(stars);
});

test('meteors are distributed across the complete draggable canvas', () => {
  const meteors = createMeteors(scene);
  assert.equal(meteors.length, 12);
  assertFullCanvasCoverage(meteors);
});
