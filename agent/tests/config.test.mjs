import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAgentConfig } from '../lib/config.mjs';

test('agent timing defaults reduce routine bridge load', () => {
  const config = loadAgentConfig({});

  assert.equal(config.pollIntervalMs, 15_000);
  assert.equal(config.heartbeatIntervalMs, 60_000);
  assert.equal(config.maxBackoffMs, 300_000);
});

test('agent timing configuration enforces safe lower bounds', () => {
  const config = loadAgentConfig({
    TIM_POLL_INTERVAL_MS: '1000',
    TIM_HEARTBEAT_INTERVAL_MS: '1000',
    TIM_MAX_BACKOFF_MS: '1000',
  });

  assert.equal(config.pollIntervalMs, 5_000);
  assert.equal(config.heartbeatIntervalMs, 15_000);
  assert.equal(config.maxBackoffMs, 30_000);
});

test('agent timing configuration accepts slower operator overrides', () => {
  const config = loadAgentConfig({
    TIM_POLL_INTERVAL_MS: '30000',
    TIM_HEARTBEAT_INTERVAL_MS: '120000',
    TIM_MAX_BACKOFF_MS: '600000',
  });

  assert.equal(config.pollIntervalMs, 30_000);
  assert.equal(config.heartbeatIntervalMs, 120_000);
  assert.equal(config.maxBackoffMs, 600_000);
});

test('backoff and heartbeat never run faster than a deliberately slow poll', () => {
  const config = loadAgentConfig({ TIM_POLL_INTERVAL_MS: '600000' });

  assert.equal(config.pollIntervalMs, 600_000);
  assert.equal(config.heartbeatIntervalMs, 600_000);
  assert.equal(config.maxBackoffMs, 600_000);
});
