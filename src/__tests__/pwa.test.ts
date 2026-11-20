import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── pwa.ts tests ─────────────────────────────────────────────────────────────
// We import after setting up mocks so the module-level code sees our stubs.

// Each test gets a fresh mock for serviceWorker + pushApi
let mockRegister: ReturnType<typeof vi.fn>;
let mockRegistration: Record<string, any>;

beforeEach(() => {
  vi.resetModules();

  mockRegistration = {
    _listeners: {} as Record<string, Function>,
    addEventListener(type: string, cb: Function) {
      this._listeners[type] = cb;
    },
    update: vi.fn().mockResolvedValue(undefined),
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue({
        toJSON: () => ({ endpoint: 'https://push.example.com/1', keys: {} }),
      }),
    },
    installing: null as any,
  };

  mockRegister = vi.fn().mockResolvedValue(mockRegistration);

  Object.defineProperty(globalThis, 'navigator', {
    writable: true,
    value: {
      serviceWorker: {
        register: mockRegister,
        controller: null as any,
        addEventListener: vi.fn(),
      },
    },
  });
});

// ── registerSW ────────────────────────────────────────────────────────────────
describe('registerSW', () => {
  it('returns null when serviceWorker is not supported', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      writable: true,
      value: {},
    });
    const { registerSW } = await import('../pwa');
    const result = await registerSW();
    expect(result).toBeNull();
  });

  it('calls navigator.serviceWorker.register with /sw.js', async () => {
    const { registerSW } = await import('../pwa');
    await registerSW();
    expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('returns the registration object on success', async () => {
    const { registerSW } = await import('../pwa');
    const result = await registerSW();
    expect(result).toBe(mockRegistration);
  });

  it('returns null and does not throw when register fails', async () => {
    mockRegister.mockRejectedValueOnce(new Error('SW register failed'));
    const { registerSW } = await import('../pwa');
    const result = await registerSW();
    expect(result).toBeNull();
  });

  it('reloads the page when a new SW activates and there was a prior controller', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { reload: reloadSpy },
    });

    // Simulate an existing controller (i.e. this is an update, not first install)
    (navigator.serviceWorker as any).controller = {};

    const newSW = {
      _listeners: {} as Record<string, Function>,
      state: 'installing',
      addEventListener(type: string, cb: Function) { this._listeners[type] = cb; },
    };
    mockRegistration.installing = newSW;

    const { registerSW } = await import('../pwa');
    await registerSW();

    // Fire the updatefound event
    mockRegistration._listeners['updatefound']?.();

    // Simulate the new SW reaching 'activated'
    newSW.state = 'activated';
    newSW._listeners['statechange']?.();

    expect(reloadSpy).toHaveBeenCalledOnce();
  });

  it('does NOT reload on first install (no prior controller)', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(globalThis, 'location', {
      writable: true,
      value: { reload: reloadSpy },
    });

    // No prior controller = first install
    (navigator.serviceWorker as any).controller = null;

    const newSW = {
      _listeners: {} as Record<string, Function>,
      state: 'installing',
      addEventListener(type: string, cb: Function) { this._listeners[type] = cb; },
    };
    mockRegistration.installing = newSW;

    const { registerSW } = await import('../pwa');
    await registerSW();

    mockRegistration._listeners['updatefound']?.();
    newSW.state = 'activated';
    newSW._listeners['statechange']?.();

    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('calls reg.update() when the page becomes visible', async () => {
    mockRegistration.update = vi.fn().mockResolvedValue(undefined);

    const { registerSW } = await import('../pwa');
    await registerSW();

    // Simulate tab becoming visible
    Object.defineProperty(document, 'visibilityState', { writable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(mockRegistration.update).toHaveBeenCalled();
  });

  it('does not call reg.update() when page becomes hidden', async () => {
    mockRegistration.update = vi.fn().mockResolvedValue(undefined);

    const { registerSW } = await import('../pwa');
    await registerSW();

    Object.defineProperty(document, 'visibilityState', { writable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(mockRegistration.update).not.toHaveBeenCalled();
  });

  it('reloads when SW_ACTIVATED message is received with a prior controller', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(globalThis, 'location', { writable: true, value: { reload: reloadSpy } });
    (navigator.serviceWorker as any).controller = {};

    const { registerSW } = await import('../pwa');
    await registerSW();

    // Find the message handler registered on navigator.serviceWorker
    const addEventSpy = navigator.serviceWorker.addEventListener as ReturnType<typeof vi.fn>;
    const [, messageHandler] = addEventSpy.mock.calls.find(([type]) => type === 'message') ?? [];
    expect(messageHandler).toBeDefined();
    messageHandler(new MessageEvent('message', { data: { type: 'SW_ACTIVATED' } }));
    expect(reloadSpy).toHaveBeenCalledOnce();
  });

  it('does not reload on SW_ACTIVATED when there is no prior controller (first install)', async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(globalThis, 'location', { writable: true, value: { reload: reloadSpy } });
    (navigator.serviceWorker as any).controller = null;

    const { registerSW } = await import('../pwa');
    await registerSW();

    const addEventSpy = navigator.serviceWorker.addEventListener as ReturnType<typeof vi.fn>;
    const [, messageHandler] = addEventSpy.mock.calls.find(([type]) => type === 'message') ?? [];
    expect(messageHandler).toBeDefined();
    messageHandler(new MessageEvent('message', { data: { type: 'SW_ACTIVATED' } }));
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});

// ── updateBadge ───────────────────────────────────────────────────────────────
describe('updateBadge', () => {
  it('calls setAppBadge when unread > 0', async () => {
    const setAppBadge = vi.fn();
    const clearAppBadge = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      writable: true,
      value: { setAppBadge, clearAppBadge },
    });
    const { updateBadge } = await import('../pwa');
    updateBadge(3);
    expect(setAppBadge).toHaveBeenCalledWith(3);
  });

  it('calls clearAppBadge when unread = 0', async () => {
    const setAppBadge = vi.fn();
    const clearAppBadge = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      writable: true,
      value: { setAppBadge, clearAppBadge },
    });
    const { updateBadge } = await import('../pwa');
    updateBadge(0);
    expect(clearAppBadge).toHaveBeenCalledOnce();
  });

  it('does nothing when badge API is not supported', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      writable: true,
      value: {},
    });
    const { updateBadge } = await import('../pwa');
    // Should not throw
    expect(() => updateBadge(5)).not.toThrow();
  });
});

// ── subscribeToPush ───────────────────────────────────────────────────────────
describe('subscribeToPush', () => {
  const VAPID_KEY = 'test-vapid-key';
  const SUB_JSON = { endpoint: 'https://push.example.com/1', expirationTime: null, keys: { p256dh: 'p256', auth: 'auth' } };

  let mockPushSubscribe: ReturnType<typeof vi.fn>;
  let mockGetSubscription: ReturnType<typeof vi.fn>;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;
  let mockSubscribeApi: ReturnType<typeof vi.fn>;
  let mockGetVapidKey: ReturnType<typeof vi.fn>;
  let mockReg: Record<string, any>;

  beforeEach(() => {
    mockUnsubscribe = vi.fn().mockResolvedValue(true);
    mockPushSubscribe = vi.fn().mockResolvedValue({ toJSON: () => SUB_JSON });
    mockGetSubscription = vi.fn().mockResolvedValue(null);
    mockSubscribeApi = vi.fn().mockResolvedValue(undefined);
    mockGetVapidKey = vi.fn().mockResolvedValue({ key: VAPID_KEY });

    mockReg = {
      pushManager: {
        subscribe: mockPushSubscribe,
        getSubscription: mockGetSubscription,
      },
    };

    // Mock pushApi
    vi.doMock('../api', () => ({
      pushApi: {
        getVapidKey: mockGetVapidKey,
        subscribe: mockSubscribeApi,
      },
    }));

    // Grant notification permission
    Object.defineProperty(globalThis, 'Notification', {
      writable: true,
      value: { requestPermission: vi.fn().mockResolvedValue('granted') },
    });

    // Stub PushManager support
    Object.defineProperty(globalThis, 'PushManager', { writable: true, configurable: true, value: {} });
  });

  it('does nothing when PushManager is not available', async () => {
    delete (globalThis as any).PushManager;
    const { subscribeToPush } = await import('../pwa');
    await subscribeToPush(mockReg as any);
    expect(mockGetVapidKey).not.toHaveBeenCalled();
  });

  it('exits early when permission is not granted', async () => {
    (Notification.requestPermission as any) = vi.fn().mockResolvedValue('denied');
    const { subscribeToPush } = await import('../pwa');
    await subscribeToPush(mockReg as any);
    expect(mockGetVapidKey).not.toHaveBeenCalled();
  });

  it('creates a new subscription when there is no existing one', async () => {
    mockGetSubscription.mockResolvedValue(null);
    const { subscribeToPush } = await import('../pwa');
    await subscribeToPush(mockReg as any);
    expect(mockPushSubscribe).toHaveBeenCalledOnce();
    expect(mockSubscribeApi).toHaveBeenCalledWith(SUB_JSON);
  });

  it('re-registers an existing valid subscription without creating a new one', async () => {
    const existingSub = { expirationTime: null, toJSON: () => SUB_JSON, unsubscribe: mockUnsubscribe };
    mockGetSubscription.mockResolvedValue(existingSub);
    const { subscribeToPush } = await import('../pwa');
    await subscribeToPush(mockReg as any);
    expect(mockPushSubscribe).not.toHaveBeenCalled();
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    expect(mockSubscribeApi).toHaveBeenCalledWith(SUB_JSON);
  });

  it('unsubscribes and resubscribes when the existing subscription is expired', async () => {
    const pastTime = Date.now() - 1000;
    const freshJson = { endpoint: 'https://push.example.com/fresh', expirationTime: null, keys: {} };
    const expiredSub = { expirationTime: pastTime, toJSON: () => SUB_JSON, unsubscribe: mockUnsubscribe };
    mockGetSubscription.mockResolvedValue(expiredSub);
    mockPushSubscribe.mockResolvedValue({ toJSON: () => freshJson });

    const { subscribeToPush } = await import('../pwa');
    await subscribeToPush(mockReg as any);

    expect(mockUnsubscribe).toHaveBeenCalledOnce();
    expect(mockPushSubscribe).toHaveBeenCalledOnce();
    expect(mockSubscribeApi).toHaveBeenCalledWith(freshJson);
  });

  it('does not throw when subscribe API call fails', async () => {
    mockGetSubscription.mockResolvedValue(null);
    mockSubscribeApi.mockRejectedValue(new Error('Network error'));
    const { subscribeToPush } = await import('../pwa');
    await expect(subscribeToPush(mockReg as any)).resolves.toBeUndefined();
  });
});
