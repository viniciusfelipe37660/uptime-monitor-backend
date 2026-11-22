import { describe, expect, it, vi } from 'vitest';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async (hostname: string) => {
    if (hostname === 'example.com') return { address: '93.184.216.34', family: 4 };
    if (hostname === 'metadata.internal') return { address: '169.254.169.254', family: 4 };
    if (hostname === 'unresolvable.invalid') throw new Error('ENOTFOUND');
    // IP literals resolve to themselves, matching real dns.lookup behavior
    return { address: hostname, family: 4 };
  }),
}));

const { checkUrlIsSafe } = await import('./url-safety.js');

describe('checkUrlIsSafe', () => {
  it('allows a normal public https URL', async () => {
    const result = await checkUrlIsSafe('https://example.com');
    expect(result.safe).toBe(true);
  });

  it('rejects non-http(s) protocols', async () => {
    const result = await checkUrlIsSafe('file:///etc/passwd');
    expect(result.safe).toBe(false);
  });

  it('rejects localhost without a DNS lookup', async () => {
    const result = await checkUrlIsSafe('http://localhost:6379');
    expect(result.safe).toBe(false);
  });

  it('rejects loopback IP literals', async () => {
    const result = await checkUrlIsSafe('http://127.0.0.1:8080');
    expect(result.safe).toBe(false);
  });

  it('rejects a hostname that resolves to the cloud metadata address', async () => {
    const result = await checkUrlIsSafe('http://metadata.internal/latest/meta-data');
    expect(result.safe).toBe(false);
  });

  it('rejects private 10.x/172.16-31.x/192.168.x IP literals', async () => {
    for (const url of ['http://10.0.0.5', 'http://172.20.0.1', 'http://192.168.1.1']) {
      const result = await checkUrlIsSafe(url);
      expect(result.safe).toBe(false);
    }
  });

  it('rejects URLs with embedded credentials', async () => {
    const result = await checkUrlIsSafe('https://user:pass@example.com');
    expect(result.safe).toBe(false);
  });

  it('rejects malformed URLs', async () => {
    const result = await checkUrlIsSafe('not a url');
    expect(result.safe).toBe(false);
  });

  it('rejects hostnames that fail to resolve', async () => {
    const result = await checkUrlIsSafe('http://unresolvable.invalid');
    expect(result.safe).toBe(false);
  });
});
