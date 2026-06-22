import { createHmac, timingSafeEqual } from 'node:crypto';

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

export function signCommand(command, secret) {
  const message = [
    command.command_id,
    command.node_id,
    command.action,
    command.risk,
    command.expires_at,
    command.approved_at || '',
    canonicalJson(command.payload || {}),
  ].join('|');
  return createHmac('sha256', secret).update(message).digest('hex');
}

export function verifyCommandAuthorization(command, secret) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(command.authorization || '')) return false;
  const expected = Buffer.from(signCommand(command, secret), 'hex');
  const supplied = Buffer.from(command.authorization, 'hex');
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
