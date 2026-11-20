import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── api.ts – BASE URL resolution ──────────────────────────────────────────────
// The BASE constant is module-level, so we must reset modules + re-import for
// each env combination.  We verify the chosen URL indirectly by inspecting the
// URL passed to the global fetch stub.

describe('BASE URL resolution', () => {
  let fetchStub: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchStub = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal('fetch', fetchStub);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses localhost:4000 in the test / dev environment (default)', async () => {
    // Vitest runs with PROD=false by default
    const { chatsApi } = await import('../api');
    await chatsApi.list().catch(() => {});
    expect(fetchStub.mock.calls[0]?.[0]).toMatch(/^http:\/\/localhost:4000\/api\//);
  });

  it('uses VITE_API_URL when set (Capacitor / Android build)', async () => {
    vi.stubEnv('VITE_API_URL', 'https://rusetochka.fly.dev');
    const { chatsApi } = await import('../api');
    await chatsApi.list().catch(() => {});
    expect(fetchStub.mock.calls[0]?.[0]).toMatch(/^https:\/\/rusetochka\.fly\.dev\/api\//);
  });
});

// ── token helpers ─────────────────────────────────────────────────────────────
describe('token helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('setTokens stores both tokens', async () => {
    const { setTokens, getAccessToken, getRefreshToken } = await import('../api');
    setTokens('acc', 'ref');
    expect(getAccessToken()).toBe('acc');
    expect(getRefreshToken()).toBe('ref');
  });

  it('clearTokens removes both tokens', async () => {
    const { setTokens, clearTokens, getAccessToken, getRefreshToken } = await import('../api');
    setTokens('acc', 'ref');
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});
