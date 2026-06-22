#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { loadAgentConfig } from './lib/config.mjs';
import { discoverCapabilities, executeCommand } from './lib/dispatcher.mjs';

const config = loadAgentConfig();
const [mode = 'capabilities', ...args] = process.argv.slice(2);

async function main() {
  if (mode === 'capabilities') {
    const capabilities = await discoverCapabilities(config);
    console.log(JSON.stringify({ node_id: config.nodeId, platform: process.platform, capabilities }, null, 2));
    return;
  }

  if (mode === 'execute') {
    const fileIndex = args.indexOf('--file');
    if (fileIndex === -1 || !args[fileIndex + 1]) throw new Error('Use execute --file <command.json>');
    const command = JSON.parse(await readFile(args[fileIndex + 1], 'utf8'));
    const result = await executeCommand(command, { config, approved: args.includes('--approved') });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (mode === 'run') {
    const controller = new AbortController();
    for (const event of ['SIGINT', 'SIGTERM']) process.once(event, () => controller.abort());
    const { runAgent } = await import('./lib/base44-transport.mjs');
    await runAgent(config, controller.signal);
    return;
  }

  throw new Error(`Unknown mode: ${mode}`);
}

main().catch((error) => {
  console.error(`TIM edge agent: ${error.message}`);
  process.exitCode = 1;
});
