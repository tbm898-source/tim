#!/usr/bin/env node
/**
 * Pre-work coordination check. Run after git pull.
 * Usage: node agent_coordination/check-in.mjs --agent cursor|codex
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

function arg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

const agent = arg('--agent') || 'cursor';
if (!['cursor', 'codex'].includes(agent)) {
  console.error('Usage: check-in.mjs --agent cursor|codex');
  process.exit(1);
}

const lanes = JSON.parse(readFileSync(join(__dirname, 'LANES.json'), 'utf8'));
const statePath = join(__dirname, 'STATE.json');
const state = JSON.parse(readFileSync(statePath, 'utf8'));

let behind = 0;
let localSha = 'unknown';
let remoteSha = 'unknown';
try {
  execSync('git fetch origin main', { cwd: repoRoot, stdio: 'pipe' });
  localSha = execSync('git rev-parse HEAD', { cwd: repoRoot, encoding: 'utf8' }).trim();
  remoteSha = execSync('git rev-parse origin/main', { cwd: repoRoot, encoding: 'utf8' }).trim();
  behind = Number(
    execSync('git rev-list --count HEAD..origin/main', { cwd: repoRoot, encoding: 'utf8' }).trim(),
  );
} catch {
  /* offline or not a git repo */
}

const myPaths = agent === 'cursor' ? lanes.cursor.paths : lanes.codex.paths;
const holder = state.holder;
const locks = state.locks || [];
const iHold = holder === agent;

function pathPrefixMatches(glob, lock) {
  const prefix = lock.replace('/**', '').replace('**', '');
  return glob.startsWith(prefix) || lock.startsWith(glob.replace('/**', ''));
}

const blocked =
  !iHold &&
  holder &&
  holder !== agent &&
  myPaths.some((p) => locks.some((l) => pathPrefixMatches(p, l)));

let status = 'GO';
let reason = 'In lane; no conflicting locks.';

if (behind > 0) {
  status = 'PULL';
  reason = `Behind origin/main by ${behind} commit(s). Run: git pull origin main`;
} else if (blocked) {
  status = 'WAIT';
  reason = `${holder} holds ${locks.join(', ')} — read INBOX.md or wait for handoff`;
}

const report = {
  status,
  agent,
  host: agent === 'cursor' ? lanes.cursor.host : lanes.codex.host,
  reason,
  git: { local: localSha.slice(0, 7), origin_main: remoteSha.slice(0, 7), behind },
  state: {
    protocol_version: state.protocol_version,
    holder: state.holder,
    host: state.host,
    active_task: state.active_task,
    locks: state.locks,
    updated_at: state.updated_at,
  },
  my_lane: myPaths,
  next: status === 'GO' ? 'Update STATE.json before editing locked paths' : reason,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = status === 'GO' ? 0 : status === 'PULL' ? 2 : 1;
