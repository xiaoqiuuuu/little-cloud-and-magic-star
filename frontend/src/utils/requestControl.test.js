import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLatestRequestCoordinator,
  createRequestDeduper,
} from './requestControl.js';


test('request deduper shares concurrent requests and releases settled entries', async () => {
  const deduplicate = createRequestDeduper();
  let callCount = 0;

  const requestFactory = async () => {
    callCount += 1;
    return 'response';
  };

  const firstRequest = deduplicate('same-request', requestFactory);
  const secondRequest = deduplicate('same-request', requestFactory);

  assert.strictEqual(firstRequest, secondRequest);
  assert.equal(await firstRequest, 'response');
  assert.equal(callCount, 1);

  assert.equal(await deduplicate('same-request', requestFactory), 'response');
  assert.equal(callCount, 2);
});


test('latest request coordinator cancels an older request with different parameters', async () => {
  const coordinateLatest = createLatestRequestCoordinator();
  let firstSignal;
  let resolveFirst;

  const firstRequest = coordinateLatest('questions', 'page=1', (signal) => {
    firstSignal = signal;
    return new Promise((resolve) => {
      resolveFirst = resolve;
    });
  });

  await Promise.resolve();

  const secondRequest = coordinateLatest(
    'questions',
    'page=2',
    async () => 'second response',
  );

  assert.equal(firstSignal.aborted, true);
  assert.equal(await secondRequest, 'second response');

  resolveFirst('first response');
  assert.equal(await firstRequest, 'first response');
});


test('latest request coordinator shares requests with identical parameters', async () => {
  const coordinateLatest = createLatestRequestCoordinator();
  let callCount = 0;

  const requestFactory = async () => {
    callCount += 1;
    return 'response';
  };

  const firstRequest = coordinateLatest('questions', 'page=1', requestFactory);
  const secondRequest = coordinateLatest('questions', 'page=1', requestFactory);

  assert.strictEqual(firstRequest, secondRequest);
  assert.equal(await firstRequest, 'response');
  assert.equal(callCount, 1);
});
