import test from 'node:test';
import assert from 'node:assert/strict';
import { layerFeedState } from './feedState.js';

const base = { count: 2, lastUpdate: 1, stale: false, partial: true };

test('layerFeedState: partial snapshots read PARTIAL when otherwise healthy', () => {
  assert.equal(layerFeedState(base), 'partial');
});

test('layerFeedState: stale beats partial so incomplete data is not mislabeled STALE-only', () => {
  assert.equal(layerFeedState({ ...base, stale: true }), 'stale');
});

test('layerFeedState: transport errors beat partial while prior rows remain drawable', () => {
  assert.equal(
    layerFeedState({ ...base, error: 'Connection lost' }),
    'degraded',
  );
});

test('layerFeedState: loading beats partial during refresh', () => {
  assert.equal(layerFeedState({ ...base, loading: true }), 'loading');
});
