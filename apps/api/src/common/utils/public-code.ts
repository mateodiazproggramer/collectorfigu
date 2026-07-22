import { randomBytes } from 'crypto';

export function createPublicCode(prefix: 'ORD' | 'REP') {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const code = randomBytes(4).toString('base64url').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5);
  return `${prefix}-${date}-${code}`;
}
