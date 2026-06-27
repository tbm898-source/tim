import os from 'node:os';
import path from 'node:path';

const splitList = (value, separator = ',') => (value || '')
  .split(separator)
  .map((item) => item.trim())
  .filter(Boolean);

export function loadAgentConfig(env = process.env) {
  const allowedWorkspaces = splitList(env.TIM_ALLOWED_WORKSPACES, path.delimiter)
    .map((workspace) => path.resolve(workspace));

  return {
    appId: env.TIM_BASE44_APP_ID || '695cfbf7fba07f58d25ff8bb',
    serverUrl: env.TIM_BASE44_SERVER_URL || 'https://base44.app',
    commandSecret: env.TIM_COMMAND_SIGNING_SECRET || '',
    nodeId: env.TIM_NODE_ID || os.hostname().toLowerCase().replace(/[^a-z0-9.-]/g, '-'),
    displayName: env.TIM_NODE_NAME || os.hostname(),
    trustLevel: env.TIM_TRUST_LEVEL || 'observe',
    pollIntervalMs: Math.max(2_000, Number(env.TIM_POLL_INTERVAL_MS) || 5_000),
    allowedWorkspaces,
    allowedShortcuts: splitList(env.TIM_ALLOWED_SHORTCUTS),
    androidStudioPath: env.TIM_ANDROID_STUDIO_PATH || '',
    adbPath: env.TIM_ADB_PATH || 'adb',
  };
}
