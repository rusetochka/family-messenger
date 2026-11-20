import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('resolveMediaUrl', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns undefined for nullish or blank', async () => {
    const { resolveMediaUrl } = await import('../assetUrl');
    expect(resolveMediaUrl(null)).toBeUndefined();
    expect(resolveMediaUrl(undefined)).toBeUndefined();
    expect(resolveMediaUrl('  ')).toBeUndefined();
  });

  it('leaves absolute and data/blob URLs unchanged', async () => {
    const { resolveMediaUrl } = await import('../assetUrl');
    expect(resolveMediaUrl('https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
    expect(resolveMediaUrl('data:image/png;base64,xx')).toBe('data:image/png;base64,xx');
    expect(resolveMediaUrl('blob:http://localhost/uuid')).toBe('blob:http://localhost/uuid');
  });

  it('prefixes root-relative paths when VITE_API_URL is set', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    const { resolveMediaUrl } = await import('../assetUrl');
    expect(resolveMediaUrl('/uploads/a.jpg')).toBe('https://api.example.com/uploads/a.jpg');
  });

  it('strips trailing slash from VITE_API_URL before joining', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
    const { resolveMediaUrl } = await import('../assetUrl');
    expect(resolveMediaUrl('/uploads/a.jpg')).toBe('https://api.example.com/uploads/a.jpg');
  });

  it('leaves root-relative paths unchanged when VITE_API_URL is unset', async () => {
    const { resolveMediaUrl } = await import('../assetUrl');
    expect(resolveMediaUrl('/uploads/a.jpg')).toBe('/uploads/a.jpg');
  });
});

describe('isTrustedMediaFetchUrl', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('allows same-origin URLs', async () => {
    const { isTrustedMediaFetchUrl } = await import('../assetUrl');
    const origin = window.location.origin;
    expect(isTrustedMediaFetchUrl(`${origin}/file`)).toBe(true);
  });

  it('allows root-relative paths', async () => {
    const { isTrustedMediaFetchUrl } = await import('../assetUrl');
    expect(isTrustedMediaFetchUrl('/uploads/x.jpg')).toBe(true);
  });

  it('allows VITE_API_URL origin when set', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    const { isTrustedMediaFetchUrl } = await import('../assetUrl');
    expect(isTrustedMediaFetchUrl('https://api.example.com/uploads/x.jpg')).toBe(true);
  });

  it('rejects javascript: and opaque blobs', async () => {
    const { isTrustedMediaFetchUrl } = await import('../assetUrl');
    expect(isTrustedMediaFetchUrl('javascript:alert(1)')).toBe(false);
    expect(isTrustedMediaFetchUrl('data:text/html,x')).toBe(false);
  });
});
