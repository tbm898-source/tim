#!/usr/bin/env node
/**
 * Verify coordination stack from Mac (or either host).
 * Usage: node agent_coordination/verify.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

/** @type {{ name: string, ok: boolean, detail: string }[]} */
const checks = [];

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
}

try {
  execSync('git fetch origin main', { cwd: repoRoot, stdio: 'pipe' });
  const behind = Number(
    execSync('git rev-list --count HEAD..origin/main', { cwd: repoRoot, encoding: 'utf8' }).trim(),
  );
  record('git_sync', behind === 0, behind === 0 ? 'up to date with origin/main' : `behind by ${behind}`);
} catch (e) {
  record('git_sync', false, e instanceof Error ? e.message : 'git fetch failed');
}

try {
  const out = execSync('npm run agent:health', { cwd: repoRoot, encoding: 'utf8', stdio: 'pipe' });
  const health = JSON.parse(out.match(/\{[\s\S]*\}/)?.[0] || '{}');
  record('agent_health', health.ok === true, health.checks?.find((c) => c.name === 'node_registration')?.detail || 'ok');
} catch {
  record('agent_health', false, 'npm run agent:health failed');
}

try {
  execSync('tailscale ping -c 1 dhd-admin', { stdio: 'pipe' });
  record('tailscale', true, 'dhd-admin reachable');
} catch {
  record('tailscale', false, 'tailscale ping failed');
}

try {
  execSync('ssh -o BatchMode=yes -o ConnectTimeout=5 dhd-admin "echo ok"', { stdio: 'pipe' });
  record('ssh_dhd_admin', true, 'key auth works');
} catch {
  record('ssh_dhd_admin', false, 'run bootstrap-dhd-admin.ps1 on Windows (key not installed yet)');
}

const state = JSON.parse(readFileSync(join(__dirname, 'STATE.json'), 'utf8'));
record('protocol', state.protocol_version === 2, `v${state.protocol_version}, holder=${state.holder}`);
record('codex_ack', Boolean(state.acks?.codex?.at), state.acks?.codex?.note || 'pending');

const failed = checks.filter((c) => !c.ok);
console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
process.exitCode = failed.length === 0 ? 0 : 1;
