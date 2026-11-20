import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

// ── Stubs: page components and chrome that App renders ────────────────────────
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Routes: () => null,
  Route: () => null,
  Navigate: () => null,
}));

vi.mock('../pages/AuthPage',    () => ({ default: () => null }));
vi.mock('../pages/AdminPage',   () => ({ default: () => null }));
vi.mock('../pages/ChatPage',    () => ({ default: () => null }));
vi.mock('../pages/ProfilePage', () => ({ default: () => null }));
vi.mock('../pages/InvitePage',  () => ({ default: () => null }));
vi.mock('../pages/PhotosPage',  () => ({ default: () => null }));
vi.mock('../components/ConfettiBurst', () => ({ default: () => null }));
vi.mock('../components/CallOverlay',   () => ({ default: () => null }));

vi.mock('../pwa', () => ({
  registerSW: vi.fn().mockResolvedValue(null),
  subscribeToPush: vi.fn(),
  updateBadge: vi.fn(),
}));

const mockRecordLatestPhotoTs = vi.fn();
vi.mock('../components/PhotosTooltip', () => ({
  recordLatestPhotoTs: (...args: any[]) => mockRecordLatestPhotoTs(...args),
  hasSeenPhotosHighlight: () => true,
  hasNewPhotoBadge: () => false,
  markPhotosHighlightSeen: vi.fn(),
  markPhotosVisited: vi.fn(),
}));

// ── Socket mock: synchronously capture registered handlers ────────────────────
let capturedHandlers: Record<string, (data: any) => void> = {};
const mockSocketOff = vi.fn();
const mockSocketOn  = vi.fn((event: string, handler: (data: any) => void) => {
  capturedHandlers[event] = handler;
});

vi.mock('../socket', () => ({
  useSocket: vi.fn((cb: (socket: any) => void) => {
    cb({ off: mockSocketOff, on: mockSocketOn });
  }),
  connectSocket:    vi.fn(),
  disconnectSocket: vi.fn(),
  getSocket:        vi.fn(),
}));

// ── Store mock ────────────────────────────────────────────────────────────────
const mockRehydrate             = vi.fn().mockResolvedValue(undefined);
const mockReceiveMessage        = vi.fn();
const mockReceiveReaction       = vi.fn();
const mockRemoveReaction        = vi.fn();
const mockReceiveMessageDeleted = vi.fn();
const mockReceiveMessageEdited  = vi.fn();
const mockSetUserOnline         = vi.fn();
const mockReceiveCallOffer      = vi.fn();
const mockReceiveCallAnswer     = vi.fn();
const mockReceiveIceCandidate   = vi.fn();
const mockReceiveCallEnd        = vi.fn();

const baseState = {
  currentUser: {
    id: 'user-1', name: 'Test', email: 'test@test.com',
    avatar: 0, status: 'approved', isAdmin: false, online: true,
  },
  chats: [],
  users: [],
  activeChat: null,
  callStatus: 'idle',
  rehydrate:               mockRehydrate,
  _receiveMessage:         mockReceiveMessage,
  _receiveReaction:        mockReceiveReaction,
  _removeReaction:         mockRemoveReaction,
  _receiveMessageDeleted:  mockReceiveMessageDeleted,
  _receiveMessageEdited:   mockReceiveMessageEdited,
  _setUserOnline:          mockSetUserOnline,
  loadPendingUsers:        vi.fn(),
  _receiveCallOffer:       mockReceiveCallOffer,
  _receiveCallAnswer:      mockReceiveCallAnswer,
  _receiveIceCandidate:    mockReceiveIceCandidate,
  _receiveCallEnd:         mockReceiveCallEnd,
};

vi.mock('../store/useStore', () => ({
  useStore: Object.assign(
    vi.fn((selector?: any) =>
      typeof selector === 'function' ? selector(baseState) : baseState
    ),
    { getState: () => baseState },
  ),
}));

// Import after mocks
import App from '../App';

async function renderApp() {
  await act(async () => {
    render(<App />);
  });
}

describe('SocketBridge — socket event handlers', () => {
  beforeEach(() => {
    capturedHandlers = {};
    vi.clearAllMocks();
    mockRehydrate.mockResolvedValue(undefined);
  });

  // ── message:new ─────────────────────────────────────────────────────────────
  it('registers a message:new handler', async () => {
    await renderApp();
    expect(capturedHandlers['message:new']).toBeDefined();
  });

  it('message:new maps all snake_case fields to camelCase', async () => {
    await renderApp();
    capturedHandlers['message:new']({
      id: 'msg-3', chat_id: 'chat-A', sender_id: 'user-X',
      type: 'image', text: null, image_url: '/uploads/img.jpg', emoji: null,
      created_at: '2026-04-19T10:00:00.000Z', reactions: [],
      reply_to_id: null,
    });
    expect(mockReceiveMessage).toHaveBeenCalledWith({
      id: 'msg-3', chatId: 'chat-A', senderId: 'user-X',
      type: 'image', text: undefined, imageUrl: '/uploads/img.jpg',
      emoji: undefined, createdAt: '2026-04-19T10:00:00.000Z',
      reactions: {}, replyToId: undefined,
    });
  });

  it('message:new forwards reply_to_id as replyToId', async () => {
    await renderApp();
    capturedHandlers['message:new']({
      id: 'msg-1', chat_id: 'chat-1', sender_id: 'user-2',
      type: 'text', text: 'Hi', image_url: null, emoji: null,
      created_at: '2024-01-01T00:00:00.000Z', reactions: [],
      reply_to_id: 'msg-ref-123',
    });
    expect(mockReceiveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ replyToId: 'msg-ref-123' })
    );
  });

  it('message:new sets replyToId to undefined when reply_to_id is absent', async () => {
    await renderApp();
    capturedHandlers['message:new']({
      id: 'msg-2', chat_id: 'chat-1', sender_id: 'user-2',
      type: 'text', text: 'World', image_url: null, emoji: null,
      created_at: '2024-01-01T00:00:00.000Z', reactions: [],
    });
    expect(mockReceiveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'msg-2', replyToId: undefined })
    );
  });

  // ── Other event handlers (notifications / reactions / presence) ──────────────
  it('reaction:updated → _receiveReaction', async () => {
    await renderApp();
    capturedHandlers['reaction:updated']({
      messageId: 'msg-1', userId: 'user-2', emoji: '👍', chatId: 'chat-1',
    });
    expect(mockReceiveReaction).toHaveBeenCalledWith('msg-1', 'chat-1', 'user-2', '👍');
  });

  it('reaction:removed → _removeReaction', async () => {
    await renderApp();
    capturedHandlers['reaction:removed']({
      messageId: 'msg-1', userId: 'user-2', chatId: 'chat-1',
    });
    expect(mockRemoveReaction).toHaveBeenCalledWith('msg-1', 'chat-1', 'user-2');
  });

  it('message:deleted → _receiveMessageDeleted', async () => {
    await renderApp();
    capturedHandlers['message:deleted']({ messageId: 'msg-1', chatId: 'chat-1' });
    expect(mockReceiveMessageDeleted).toHaveBeenCalledWith('msg-1', 'chat-1');
  });

  it('message:edited → _receiveMessageEdited', async () => {
    await renderApp();
    capturedHandlers['message:edited']({
      messageId: 'msg-1', chatId: 'chat-1', text: 'edited text',
    });
    expect(mockReceiveMessageEdited).toHaveBeenCalledWith('msg-1', 'chat-1', 'edited text');
  });

  it('user:online → _setUserOnline', async () => {
    await renderApp();
    capturedHandlers['user:online']({
      userId: 'user-2', online: true, lastSeen: '2026-04-19T10:00:00.000Z',
    });
    expect(mockSetUserOnline).toHaveBeenCalledWith('user-2', true, '2026-04-19T10:00:00.000Z');
  });

  it('photo:new → calls recordLatestPhotoTs with created_at', async () => {
    await renderApp();
    expect(capturedHandlers['photo:new']).toBeDefined();
    capturedHandlers['photo:new']({ created_at: '2026-04-19T12:00:00.000Z' });
    expect(mockRecordLatestPhotoTs).toHaveBeenCalledWith('2026-04-19T12:00:00.000Z');
  });
});
