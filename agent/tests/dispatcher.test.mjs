import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { executeCommand } from '../lib/dispatcher.mjs';
import { signCommand, verifyCommandAuthorization } from '../lib/authorization.mjs';

const config = {
  allowedWorkspaces: [path.resolve(os.tmpdir(), 'tim-allowed')],
  allowedShortcuts: ['Lights On'],
  androidStudioPath: '',
  adbPath: 'adb',
};

test('system inventory returns a bounded local snapshot', async () => {
  const result = await executeCommand({ action: 'system.inventory' }, { config, platform: process.platform });
  assert.equal(typeof result.hostname, 'string');
  assert.ok(result.cpu_count > 0);
});

test('unknown actions are rejected', async () => {
  await assert.rejects(
    executeCommand({ action: 'shell.exec', payload: { command: 'whoami' } }, { config, approved: true }),
    /not allowlisted/,
  );
});

test('write actions require explicit approval', async () => {
  await assert.rejects(
    executeCommand({ action: 'android.build', payload: { workspace: config.allowedWorkspaces[0] } }, { config, platform: process.platform }),
    /requires an approved command/,
  );
});

test('workspace traversal is rejected before process execution', async () => {
  await assert.rejects(
    executeCommand(
      { action: 'android.build', payload: { workspace: path.resolve(os.tmpdir(), 'outside'), task: 'assembleDebug' } },
      { config, platform: process.platform, approved: true },
    ),
    /outside TIM_ALLOWED_WORKSPACES/,
  );
});

test('ping input cannot inject command arguments', async () => {
  await assert.rejects(
    executeCommand({ action: 'network.ping', payload: { host: 'localhost & whoami' } }, { config, platform: process.platform }),
    /Invalid ping host/,
  );
});

test('command signatures bind the payload and approval', () => {
  const command = {
    command_id: 'cmd-1',
    node_id: 'node-1',
    action: 'app.launch',
    risk: 'medium',
    expires_at: '2030-01-01T00:00:00.000Z',
    approved_at: '2029-12-31T23:59:00.000Z',
    payload: { app: 'android_studio' },
  };
  const signed = { ...command, authorization: signCommand(command, 'test-secret') };
  assert.equal(verifyCommandAuthorization(signed, 'test-secret'), true);
  assert.equal(verifyCommandAuthorization({ ...signed, payload: { app: 'xcode' } }, 'test-secret'), false);
});
