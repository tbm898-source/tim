import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

// ---------------------------------------------------------------------------
// Inline a minimal testable version of bridgeRequest logic so we can inject
// a mock fetch without touching the module system at import time.
// ---------------------------------------------------------------------------

function makeBridgeRequest(fetchImpl) {
  return async function bridgeRequest(config, action, payload = {}) {
    const { agentEndpoint, commandSecret } = config;

    if (!agentEndpoint) throw new Error('TIM_AGENT_ENDPOINT is required for connected mode');
    if (!commandSecret) throw new Error('TIM_COMMAND_SIGNING_SECRET is required for connected mode');

    const rawBody = JSON.stringify({ action, payload });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac('sha256', commandSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    let response;
    try {
      response = await fetchImpl(agentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TIM-Timestamp': timestamp,
          'X-TIM-Signature': signature,
        },
        body: rawBody,
      });
    } catch (networkError) {
      throw new Error(`Bridge request failed: ${networkError.message}`);
    }

    if (!response.ok) {
      throw new Error(`Bridge returned HTTP ${response.status} for action '${action}'`);
    }

    let parsed;
    try {
      parsed = await response.json();
    } catch {
      throw new Error(`Bridge returned non-JSON response for action '${action}'`);
    }

    if (parsed && typeof parsed.error === 'string') {
      throw new Error(`Bridge error for action '${action}': ${parsed.error}`);
    }

    if (!Object.prototype.hasOwnProperty.call(parsed, 'data')) {
      throw new Error(`Bridge response missing 'data' field for action '${action}'`);
    }

    return parsed.data;
  };
}

// ---------------------------------------------------------------------------
// Helper: build a minimal fake Response
// ---------------------------------------------------------------------------

function fakeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (typeof body === 'string') {
        const parsed = JSON.parse(body);
        return parsed;
      }
      return body;
    },
  };
}

const GOOD_CONFIG = {
  agentEndpoint: 'https://example.base44.app/api/bridge',
  commandSecret: 'a'.repeat(64),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('missing endpoint throws immediately without making a request', async () => {
  const br = makeBridgeRequest(() => { throw new Error('should not reach fetch'); });
  await assert.rejects(
    br({ agentEndpoint: '', commandSecret: 'a'.repeat(64) }, 'listPendingCommands', {}),
    /TIM_AGENT_ENDPOINT is required/,
  );
});

test('missing secret throws immediately without making a request', async () => {
  const br = makeBridgeRequest(() => { throw new Error('should not reach fetch'); });
  await assert.rejects(
    br({ agentEndpoint: 'https://example.com', commandSecret: '' }, 'listPendingCommands', {}),
    /TIM_COMMAND_SIGNING_SECRET is required/,
  );
});

test('signature is lowercase hex and uses the exact raw body', async () => {
  const calls = [];
  const br = makeBridgeRequest(async (url, opts) => {
    calls.push(opts);
    return fakeResponse(200, { data: null });
  });

  await br(GOOD_CONFIG, 'getDeviceNode', { node_id: 'tim-primary-mac' });

  assert.equal(calls.length, 1);
  const opts = calls[0];

  // Signature must be lowercase hex
  const sig = opts.headers['X-TIM-Signature'];
  assert.match(sig, /^[a-f0-9]{64}$/);

  // The raw body must be exactly JSON.stringify({ action, payload })
  const expectedBody = JSON.stringify({ action: 'getDeviceNode', payload: { node_id: 'tim-primary-mac' } });
  assert.equal(opts.body, expectedBody);

  // Verify the signature against the body we captured
  const timestamp = opts.headers['X-TIM-Timestamp'];
  const expectedSig = createHmac('sha256', GOOD_CONFIG.commandSecret)
    .update(`${timestamp}.${expectedBody}`)
    .digest('hex');
  assert.equal(sig, expectedSig);
});

test('body and HMAC input are the exact same bytes (stringify once)', async () => {
  const calls = [];
  const br = makeBridgeRequest(async (url, opts) => {
    calls.push(opts);
    return fakeResponse(200, { data: [] });
  });

  const payload = { node_id: 'tim-primary-mac', extra: 'value' };
  await br(GOOD_CONFIG, 'listPendingCommands', payload);

  const { body, headers } = calls[0];
  const timestamp = headers['X-TIM-Timestamp'];
  const sig = headers['X-TIM-Signature'];
  const recomputed = createHmac('sha256', GOOD_CONFIG.commandSecret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  assert.equal(sig, recomputed, 'Signature must be over the exact transmitted body');
});

test('HTTP non-2xx is rejected', async () => {
  const br = makeBridgeRequest(async () => fakeResponse(503, { error: 'service unavailable' }));
  await assert.rejects(
    br(GOOD_CONFIG, 'listPendingCommands', {}),
    /Bridge returned HTTP 503/,
  );
});

test('non-JSON response is rejected', async () => {
  const br = makeBridgeRequest(async () => ({
    ok: true,
    status: 200,
    json: async () => { throw new SyntaxError('Unexpected token'); },
  }));
  await assert.rejects(
    br(GOOD_CONFIG, 'listPendingCommands', {}),
    /Bridge returned non-JSON response/,
  );
});

test('bridge error body is rejected and message is surfaced', async () => {
  const br = makeBridgeRequest(async () => fakeResponse(200, { error: 'node not found' }));
  await assert.rejects(
    br(GOOD_CONFIG, 'getDeviceNode', { node_id: 'tim-primary-mac' }),
    /node not found/,
  );
});

test('success response without data field is rejected', async () => {
  const br = makeBridgeRequest(async () => fakeResponse(200, { result: 'ok' }));
  await assert.rejects(
    br(GOOD_CONFIG, 'createDeviceNode', {}),
    /missing 'data' field/,
  );
});

test('network failure is wrapped with a clear message', async () => {
  const br = makeBridgeRequest(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(
    br(GOOD_CONFIG, 'listPendingCommands', {}),
    /Bridge request failed: Failed to fetch/,
  );
});

test('successful response returns data field value', async () => {
  const expected = [{ id: 'cmd-1', action: 'system.inventory' }];
  const br = makeBridgeRequest(async () => fakeResponse(200, { data: expected }));
  const result = await br(GOOD_CONFIG, 'listPendingCommands', {});
  assert.deepEqual(result, expected);
});

test('secret does not appear in thrown error messages', async () => {
  const br = makeBridgeRequest(async () => fakeResponse(503, {}));
  try {
    await br(GOOD_CONFIG, 'listPendingCommands', {});
    assert.fail('Expected an error to be thrown');
  } catch (err) {
    assert.ok(
      !err.message.includes(GOOD_CONFIG.commandSecret),
      'Error message must not contain the signing secret',
    );
  }
});
