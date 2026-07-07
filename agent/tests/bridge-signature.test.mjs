import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

const SECRET = 'test-bridge-secret-for-unit-tests-only';

function signBridgeRequest(body, timestamp, secret) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

function verifyBridgeRequest(body, timestamp, signature, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const skew = Math.abs(nowSeconds - Number(timestamp));
  if (skew > 300) return false;
  const expected = signBridgeRequest(body, timestamp, secret);
  return expected.toLowerCase() === signature.toLowerCase();
}

test('bridge signature accepts a valid signed request body', () => {
  const body = JSON.stringify({ action: 'getDeviceNode', payload: { node_id: 'dhd-admin' } });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signBridgeRequest(body, timestamp, SECRET);
  assert.equal(verifyBridgeRequest(body, timestamp, signature, SECRET), true);
});

test('bridge signature rejects tampered bodies', () => {
  const body = JSON.stringify({ action: 'getDeviceNode', payload: { node_id: 'dhd-admin' } });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signBridgeRequest(body, timestamp, SECRET);
  const tampered = JSON.stringify({ action: 'listDeviceNodes', payload: {} });
  assert.equal(verifyBridgeRequest(tampered, timestamp, signature, SECRET), false);
});

test('bridge signature rejects stale timestamps', () => {
  const body = JSON.stringify({ action: 'listPendingCommands', payload: { node_id: 'dhd-admin' } });
  const timestamp = (Math.floor(Date.now() / 1000) - 600).toString();
  const signature = signBridgeRequest(body, timestamp, SECRET);
  assert.equal(verifyBridgeRequest(body, timestamp, signature, SECRET), false);
});
