import { access, constants } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MAX_OUTPUT = 64 * 1024;
const HOST_PATTERN = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9._:-]{0,251}[a-zA-Z0-9])?)$/;
const ANDROID_TASKS = new Set(['assembleDebug', 'bundleDebug', 'test', 'lint']);
const XCODE_ACTIONS = new Set(['build', 'test']);

export const ACTIONS = Object.freeze({
  'system.inventory': { risk: 'read_only', platforms: ['win32', 'darwin', 'linux'] },
  'android.devices': { risk: 'read_only', platforms: ['win32', 'darwin', 'linux'] },
  'network.ping': { risk: 'read_only', platforms: ['win32', 'darwin', 'linux'] },
  'android.build': { risk: 'medium', platforms: ['win32', 'darwin', 'linux'] },
  'android.install': { risk: 'high', platforms: ['win32', 'darwin', 'linux'] },
  'app.launch': { risk: 'medium', platforms: ['win32', 'darwin'] },
  'xcode.list': { risk: 'read_only', platforms: ['darwin'] },
  'xcode.build': { risk: 'medium', platforms: ['darwin'] },
  'shortcut.run': { risk: 'high', platforms: ['darwin'] },
});

function assertAllowedPath(target, allowedWorkspaces) {
  if (!target) throw new Error('A workspace path is required');
  if (!allowedWorkspaces?.length) throw new Error('TIM_ALLOWED_WORKSPACES is not configured');
  const resolved = path.resolve(target);
  const allowed = allowedWorkspaces.some((root) => {
    const relative = path.relative(path.resolve(root), resolved);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  });
  if (!allowed) throw new Error('Target is outside TIM_ALLOWED_WORKSPACES');
  return resolved;
}

async function runFile(file, args, options = {}) {
  const startedAt = Date.now();
  try {
    const { stdout = '', stderr = '' } = await execFileAsync(file, args, {
      cwd: options.cwd,
      timeout: options.timeout || 120_000,
      windowsHide: true,
      maxBuffer: MAX_OUTPUT,
      env: process.env,
    });
    return {
      exit_code: 0,
      stdout: stdout.slice(0, MAX_OUTPUT),
      stderr: stderr.slice(0, MAX_OUTPUT),
      duration_ms: Date.now() - startedAt,
    };
  } catch (error) {
    const message = error.code === 'ENOENT' ? `${file} is not installed or not on PATH` : error.message;
    const wrapped = new Error(message);
    wrapped.result = {
      exit_code: Number.isInteger(error.code) ? error.code : 1,
      stdout: String(error.stdout || '').slice(0, MAX_OUTPUT),
      stderr: String(error.stderr || message).slice(0, MAX_OUTPUT),
      duration_ms: Date.now() - startedAt,
    };
    throw wrapped;
  }
}

function runDetached(file, args) {
  const child = spawn(file, args, { detached: true, stdio: 'ignore', windowsHide: true, shell: false });
  child.unref();
  return { launched: true, process_id: child.pid };
}

async function commandAvailable(file, platform) {
  const locator = platform === 'win32' ? 'where.exe' : 'which';
  try {
    await execFileAsync(locator, [file], { timeout: 3_000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function appExists(appPath) {
  try {
    await access(appPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function discoverCapabilities(config, platform = process.platform) {
  const capabilities = ['system.inventory', 'network.ping'];

  if (await commandAvailable(config.adbPath, platform)) {
    capabilities.push('android.devices', 'android.install');
  }

  if (config.allowedWorkspaces.length) capabilities.push('android.build');

  if (platform === 'win32') {
    if (config.androidStudioPath && await appExists(config.androidStudioPath)) {
      capabilities.push('app.launch');
    }
  }

  if (platform === 'darwin') {
    // Xcode: only if xcodebuild is actually executable
    if (await commandAvailable('xcodebuild', platform)) {
      capabilities.push('xcode.list', 'xcode.build');
    }

    // app.launch on darwin: Xcode requires xcodebuild present; Android Studio requires the .app bundle
    const canLaunchXcode = await commandAvailable('xcodebuild', platform);
    const canLaunchAndroidStudio = await appExists('/Applications/Android Studio.app');
    if (canLaunchXcode || canLaunchAndroidStudio) {
      capabilities.push('app.launch');
    }

    // shortcut.run: shortcuts CLI must be present and allowlist must be non-empty
    if (config.allowedShortcuts.length && await commandAvailable('shortcuts', platform)) {
      capabilities.push('shortcut.run');
    }
  }

  return capabilities;
}

export async function executeCommand(command, context) {
  const policy = ACTIONS[command?.action];
  if (!policy) throw new Error('Action is not allowlisted by this agent');
  const platform = context.platform || process.platform;
  if (!policy.platforms.includes(platform)) throw new Error(`${command.action} is unavailable on ${platform}`);
  if (policy.risk !== 'read_only' && !context.approved) {
    throw new Error(`${command.action} requires an approved command`);
  }

  const payload = command.payload || {};
  const config = context.config;

  switch (command.action) {
    case 'system.inventory':
      return {
        hostname: os.hostname(),
        platform,
        os_release: os.release(),
        architecture: os.arch(),
        cpu_count: os.cpus().length,
        memory_bytes: os.totalmem(),
        uptime_seconds: os.uptime(),
      };

    case 'network.ping': {
      if (!HOST_PATTERN.test(payload.host || '')) throw new Error('Invalid ping host');
      const args = platform === 'win32'
        ? ['-n', '1', '-w', '2000', payload.host]
        : ['-c', '1', '-W', '2', payload.host];
      return runFile('ping', args, { timeout: 5_000 });
    }

    case 'android.devices':
      return runFile(config.adbPath, ['devices', '-l'], { timeout: 10_000 });

    case 'android.build': {
      const workspace = assertAllowedPath(payload.workspace, config.allowedWorkspaces);
      const task = payload.task || 'assembleDebug';
      if (!ANDROID_TASKS.has(task)) throw new Error('Android build task is not allowlisted');
      const wrapper = path.join(workspace, platform === 'win32' ? 'gradlew.bat' : 'gradlew');
      await access(wrapper);
      return runFile(wrapper, [task, '--no-daemon'], { cwd: workspace, timeout: 15 * 60_000 });
    }

    case 'android.install': {
      const apk = assertAllowedPath(payload.apk, config.allowedWorkspaces);
      if (path.extname(apk).toLowerCase() !== '.apk') throw new Error('Only APK files can be installed');
      await access(apk);
      const args = payload.serial
        ? ['-s', String(payload.serial), 'install', '-r', apk]
        : ['install', '-r', apk];
      return runFile(config.adbPath, args, { timeout: 120_000 });
    }

    case 'app.launch':
      if (payload.app === 'android_studio') {
        if (platform === 'win32') {
          if (!config.androidStudioPath) throw new Error('TIM_ANDROID_STUDIO_PATH is not configured');
          await access(config.androidStudioPath);
          return runDetached(config.androidStudioPath, []);
        }
        return runFile('open', ['-a', 'Android Studio'], { timeout: 10_000 });
      }
      if (payload.app === 'xcode' && platform === 'darwin') {
        return runFile('open', ['-a', 'Xcode'], { timeout: 10_000 });
      }
      throw new Error('App is not allowlisted for this platform');

    case 'xcode.list': {
      const project = assertAllowedPath(payload.project, config.allowedWorkspaces);
      if (!project.endsWith('.xcodeproj') && !project.endsWith('.xcworkspace')) {
        throw new Error('Xcode target must be an .xcodeproj or .xcworkspace');
      }
      const flag = project.endsWith('.xcworkspace') ? '-workspace' : '-project';
      return runFile('xcodebuild', ['-list', flag, project], { cwd: path.dirname(project), timeout: 60_000 });
    }

    case 'xcode.build': {
      const project = assertAllowedPath(payload.project, config.allowedWorkspaces);
      const action = payload.build_action || 'build';
      if (!XCODE_ACTIONS.has(action)) throw new Error('Xcode action is not allowlisted');
      if (!payload.scheme || !/^[a-zA-Z0-9._ -]{1,100}$/.test(payload.scheme)) throw new Error('A valid Xcode scheme is required');
      const flag = project.endsWith('.xcworkspace') ? '-workspace' : '-project';
      return runFile('xcodebuild', [flag, project, '-scheme', payload.scheme, action], {
        cwd: path.dirname(project),
        timeout: 20 * 60_000,
      });
    }

    case 'shortcut.run':
      if (!config.allowedShortcuts.includes(payload.name)) throw new Error('Shortcut is not allowlisted');
      return runFile('shortcuts', ['run', payload.name], { timeout: 120_000 });

    default:
      throw new Error('Action has no handler');
  }
}
