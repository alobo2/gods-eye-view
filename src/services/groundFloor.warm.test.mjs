import test from 'node:test';
import assert from 'node:assert/strict';
import { createGroundFloor } from './groundFloor.js';

test('warmGroundFloor chains contending calls instead of dropping their cells', async () => {
  const batches = [];
  let releaseFirst;
  const firstBlocked = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  let resolveSecondBatch;
  const secondBatchDone = new Promise((resolve) => {
    resolveSecondBatch = resolve;
  });
  const terrain = {
    cachedRealEllipsoidalGround: () => null,
    resolveEllipsoidalGround: async (cells) => {
      batches.push(cells.map((c) => `${c.lat},${c.lon}`));
      if (batches.length === 1) await firstBlocked;
      if (batches.length === 2) resolveSecondBatch();
    },
  };
  const { warmGroundFloor } = createGroundFloor({ terrain, signal: null });

  warmGroundFloor([{ lat: 30.2004, lon: -97.6604 }]);
  warmGroundFloor([{ lat: 30.3004, lon: -97.6604 }]);

  assert.equal(batches.length, 1, 'only the first batch may start while in flight');
  releaseFirst();
  await secondBatchDone;

  assert.equal(batches.length, 2);
  assert.deepEqual(batches[0], ['30.2,-97.66']);
  assert.deepEqual(batches[1], ['30.3,-97.66']);
});

test('warmGroundFloor still flushes queued cells when the in-flight batch rejects', async () => {
  const batches = [];
  let releaseFirst;
  const firstBlocked = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  let resolveSecondBatch;
  const secondBatchDone = new Promise((resolve) => {
    resolveSecondBatch = resolve;
  });
  const terrain = {
    cachedRealEllipsoidalGround: () => null,
    resolveEllipsoidalGround: async (cells) => {
      batches.push(cells.map((c) => `${c.lat},${c.lon}`));
      if (batches.length === 1) {
        await firstBlocked;
        throw new Error('simulated terrain outage');
      }
      resolveSecondBatch();
    },
  };
  const { warmGroundFloor } = createGroundFloor({ terrain, signal: null });

  warmGroundFloor([{ lat: 30.2004, lon: -97.6604 }]);
  warmGroundFloor([{ lat: 30.3004, lon: -97.6604 }]);

  releaseFirst();
  await secondBatchDone;

  assert.equal(batches.length, 2);
  assert.deepEqual(batches[1], ['30.3,-97.66']);
});
