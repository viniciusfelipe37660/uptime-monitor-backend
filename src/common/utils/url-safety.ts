import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Blocks requests to loopback, private, link-local (incl. cloud metadata
 * 169.254.169.254) and other non-public ranges. Required because monitor
 * URLs are user-supplied and fetched server-side by the worker — without
 * this, the app is a trivial SSRF vector into internal infrastructure.
 */
function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 0) return true; // "this network"
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1') return true; // loopback
    if (normalized.startsWith('fc') || normalized.startsWith('fd'))
      return true; // unique local
    if (normalized.startsWith('fe80')) return true; // link-local
    if (normalized.startsWith('::ffff:')) {
      return isPrivateIp(normalized.replace('::ffff:', ''));
    }
    return false;
  }
  return true; // unparseable -> treat as unsafe
}

export interface UrlSafetyResult {
  safe: boolean;
  reason?: string;
  resolvedIp?: string;
}

export async function checkUrlIsSafe(rawUrl: string): Promise<UrlSafetyResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'Invalid URL' };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { safe: false, reason: 'Only http/https URLs are allowed' };
  }

  if (parsed.username || parsed.password) {
    return { safe: false, reason: 'URLs with credentials are not allowed' };
  }

  const hostname = parsed.hostname;
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    return { safe: false, reason: 'Localhost targets are not allowed' };
  }

  try {
    const { address } = await lookup(hostname);
    if (isPrivateIp(address)) {
      return {
        safe: false,
        reason: 'Target resolves to a private or reserved IP address',
        resolvedIp: address,
      };
    }
    return { safe: true, resolvedIp: address };
  } catch {
    return { safe: false, reason: 'Could not resolve hostname' };
  }
}
