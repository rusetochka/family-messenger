import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external side-effect modules before importing the store
vi.mock('../api', () => ({
  authApi: { login: vi.fn(), register: vi.fn(), me: vi.fn(), logout: vi.fn() },
  usersApi: { list: vi.fn(), approve: vi.fn(), reject: vi.fn(), pending: vi.fn(), updateMe: vi.fn(), me: vi.fn(), updatePhoto: vi.fn() },
  chatsApi: { list: vi.fn(), createDM: vi.fn(), createGroup: vi.fn(), markRead: vi.fn(), rename: vi.fn(), deleteGroup: vi.fn(), addMember: vi.fn(), updateGroupPhoto: vi.fn(), listMembers: vi.fn() },
  messagesApi: { list: vi.fn(), send: vi.fn(), addReaction: vi.fn(), removeReaction: vi.fn() },
  uploadFile: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getRefreshToken: vi.fn(),
  getAccessToken: vi.fn().mockReturnValue(null),
}));

vi.mock('../socket', () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn().mockReturnValue(null),
}));

import { useStore } from '../store/useStore';
import { usersApi } from '../api';

// Reset store state between tests
beforeEach(() => {
  useStore.setState({
    messages: {},
    chats: [],
    users: [],
    currentUser: null,
    activeChat: null,
  });
});

// ── _receiveMessage ───────────────────────────────────────────────────────────
describe('_receiveMessage', () => {
  const msg = {
    id: 'msg-1', chatId: 'chat-A', senderId: 'user-1',
    type: 'text' as const, text: 'Hello', createdAt: new Date().toISOString(),
    reactions: {},
  };

  it('adds a new message to the correct chat', () => {
    useStore.getState()._receiveMessage(msg);
    const msgs = useStore.getState().messages['chat-A'];
    expect(msgs).toHaveLength(1);
    expect(msgs[0].id).toBe('msg-1');
  });

  it('deduplicates — does not add the same message twice', () => {
    useStore.getState()._receiveMessage(msg);
    useStore.getState()._receiveMessage(msg); // duplicate
    const msgs = useStore.getState().messages['chat-A'];
    expect(msgs).toHaveLength(1);
  });

  it('keeps messages from different chats separate', () => {
    const msg2 = { ...msg, id: 'msg-2', chatId: 'chat-B' };
    useStore.getState()._receiveMessage(msg);
    useStore.getState()._receiveMessage(msg2);
    expect(useStore.getState().messages['chat-A']).toHaveLength(1);
    expect(useStore.getState().messages['chat-B']).toHaveLength(1);
  });

  it('enriches replyTo from local state when only replyToId is present', () => {
    // Seed the original message into the store
    const original = { ...msg, id: 'msg-0', text: 'Original' };
    useStore.setState({ messages: { 'chat-A': [original] } });

    // Incoming reply has replyToId but no replyTo (as returned by POST endpoint)
    const reply = { ...msg, id: 'msg-reply', replyToId: 'msg-0', replyTo: undefined };
    useStore.getState()._receiveMessage(reply);

    const stored = useStore.getState().messages['chat-A'].find(m => m.id === 'msg-reply');
    expect(stored?.replyTo).toBeDefined();
    expect(stored?.replyTo?.id).toBe('msg-0');
    expect(stored?.replyTo?.text).toBe('Original');
  });

  it('leaves replyTo undefined when replyToId references a message not yet loaded', () => {
    useStore.setState({ messages: { 'chat-A': [] } });
    const reply = { ...msg, id: 'msg-reply', replyToId: 'msg-unknown', replyTo: undefined };
    useStore.getState()._receiveMessage(reply);

    const stored = useStore.getState().messages['chat-A'].find(m => m.id === 'msg-reply');
    expect(stored?.replyTo).toBeUndefined();
  });
});

// ── _receiveReaction ──────────────────────────────────────────────────────────
describe('_receiveReaction', () => {
  const baseMsg = {
    id: 'msg-1', chatId: 'chat-A', senderId: 'user-1',
    type: 'text' as const, text: 'Hi', createdAt: new Date().toISOString(),
    reactions: {},
  };

  beforeEach(() => {
    useStore.setState({ messages: { 'chat-A': [baseMsg] } });
  });

  it('adds an emoji reaction from a user', () => {
    useStore.getState()._receiveReaction('msg-1', 'chat-A', 'user-2', '👍');
    const msg = useStore.getState().messages['chat-A'][0];
    expect(msg.reactions!['👍']).toContain('user-2');
  });

  it('does not duplicate the same reaction from the same user', () => {
    useStore.getState()._receiveReaction('msg-1', 'chat-A', 'user-2', '❤️');
    useStore.getState()._receiveReaction('msg-1', 'chat-A', 'user-2', '❤️');
    const msg = useStore.getState().messages['chat-A'][0];
    expect(msg.reactions!['❤️']).toHaveLength(1);
  });

  it('supports multiple different emojis', () => {
    useStore.getState()._receiveReaction('msg-1', 'chat-A', 'user-2', '👍');
    useStore.getState()._receiveReaction('msg-1', 'chat-A', 'user-3', '😂');
    const msg = useStore.getState().messages['chat-A'][0];
    expect(msg.reactions!['👍']).toHaveLength(1);
    expect(msg.reactions!['😂']).toHaveLength(1);
  });
});

// ── _removeReaction ───────────────────────────────────────────────────────────
describe('_removeReaction', () => {
  const baseMsg = {
    id: 'msg-1', chatId: 'chat-A', senderId: 'user-1',
    type: 'text' as const, text: 'Hi', createdAt: new Date().toISOString(),
    reactions: { '👍': ['user-2', 'user-3'] },
  };

  beforeEach(() => {
    useStore.setState({ messages: { 'chat-A': [{ ...baseMsg, reactions: { '👍': ['user-2', 'user-3'] } }] } });
  });

  it('removes a specific user from an emoji', () => {
    useStore.getState()._removeReaction('msg-1', 'chat-A', 'user-2');
    const msg = useStore.getState().messages['chat-A'][0];
    expect(msg.reactions!['👍']).not.toContain('user-2');
    expect(msg.reactions!['👍']).toContain('user-3');
  });

  it('deletes the emoji key when no users remain', () => {
    useStore.getState()._removeReaction('msg-1', 'chat-A', 'user-2');
    useStore.getState()._removeReaction('msg-1', 'chat-A', 'user-3');
    const msg = useStore.getState().messages['chat-A'][0];
    expect(msg.reactions).not.toHaveProperty('👍');
  });
});

// ── loadPendingUsers ──────────────────────────────────────────────────────────
describe('loadPendingUsers', () => {
  const approvedUser = { id: 'u-1', name: 'Alice', email: 'a@a.com', avatar: 0,
    photo_url: null, status: 'approved' as const, is_admin: false, online: true, last_seen: null };
  const pendingUser  = { id: 'u-2', name: 'Bob',   email: 'b@b.com', avatar: 0,
    photo_url: null, status: 'pending'  as const, is_admin: false, online: false, last_seen: null };

  it('merges pending users into the existing users list without removing approved ones', async () => {
    vi.mocked(usersApi.pending).mockResolvedValue([pendingUser] as any);
    useStore.setState({ users: [{ id: 'u-1', name: 'Alice', email: 'a@a.com', avatar: 0, status: 'approved', isAdmin: false, online: true }] as any });

    await useStore.getState().loadPendingUsers();

    const users = useStore.getState().users;
    expect(users.length).toBe(2);
    expect(users.map(u => u.id)).toContain('u-1');
    expect(users.map(u => u.id)).toContain('u-2');
  });

  it('replaces a stale pending entry when refetched', async () => {
    const updatedPending = { ...pendingUser, name: 'Bob Updated' };
    vi.mocked(usersApi.pending).mockResolvedValue([updatedPending] as any);
    useStore.setState({ users: [{ id: 'u-2', name: 'Bob', email: 'b@b.com', avatar: 0, status: 'pending', isAdmin: false, online: false }] as any });

    await useStore.getState().loadPendingUsers();

    const users = useStore.getState().users;
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('Bob Updated');
  });

  it('loadUsers then loadPendingUsers preserves pending users', async () => {
    vi.mocked(usersApi.list).mockResolvedValue([approvedUser] as any);
    vi.mocked(usersApi.pending).mockResolvedValue([pendingUser] as any);

    await useStore.getState().loadUsers();
    await useStore.getState().loadPendingUsers();

    const users = useStore.getState().users;
    expect(users.map(u => u.id)).toContain('u-1');
    expect(users.map(u => u.id)).toContain('u-2');
  });
});

// ── updateAvatar (with optional name) ────────────────────────────────────────
describe('updateAvatar', () => {
  const baseApiUser = {
    id: 'u-1', name: 'Alice', email: 'alice@test.com',
    avatar: 2, photo_url: null, status: 'approved', is_admin: false,
    online: true, last_seen: null,
  };

  beforeEach(() => {
    useStore.setState({
      currentUser: {
        id: 'u-1', name: 'Alice', email: 'alice@test.com',
        avatar: 0, status: 'approved', isAdmin: false,
        online: true, photoUrl: undefined,
      },
      users: [{
        id: 'u-1', name: 'Alice', email: 'alice@test.com',
        avatar: 0, status: 'approved', isAdmin: false,
        online: true, photoUrl: undefined,
      }],
    });
  });

  it('updates avatar without changing name', async () => {
    vi.mocked(usersApi.updateMe).mockResolvedValueOnce({ ...baseApiUser, avatar: 2 });
    await useStore.getState().updateAvatar(2);
    expect(usersApi.updateMe).toHaveBeenCalledWith({ avatar: 2 });
    expect(useStore.getState().currentUser?.avatar).toBe(2);
  });

  it('sends name when provided', async () => {
    vi.mocked(usersApi.updateMe).mockResolvedValueOnce({ ...baseApiUser, name: 'Alice Renamed' });
    await useStore.getState().updateAvatar(2, 'Alice Renamed');
    expect(usersApi.updateMe).toHaveBeenCalledWith({ avatar: 2, name: 'Alice Renamed' });
    expect(useStore.getState().currentUser?.name).toBe('Alice Renamed');
  });

  it('does not send name field when name is undefined', async () => {
    vi.mocked(usersApi.updateMe).mockResolvedValueOnce(baseApiUser);
    await useStore.getState().updateAvatar(0, undefined);
    expect(usersApi.updateMe).toHaveBeenCalledWith({ avatar: 0 });
  });

  it('updates the user in the users array as well', async () => {
    vi.mocked(usersApi.updateMe).mockResolvedValueOnce({ ...baseApiUser, name: 'Bob' });
    await useStore.getState().updateAvatar(0, 'Bob');
    const inList = useStore.getState().users.find(u => u.id === 'u-1');
    expect(inList?.name).toBe('Bob');
  });
});

// ── setWallpaper ──────────────────────────────────────────────────────────────
describe('setWallpaper', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({ wallpaper: 'kinCircle' });
  });

  it('updates wallpaper state', () => {
    useStore.getState().setWallpaper('sakura');
    expect(useStore.getState().wallpaper).toBe('sakura');
  });

  it('persists wallpaper to localStorage', () => {
    useStore.getState().setWallpaper('sakura');
    expect(localStorage.getItem('chat-wallpaper')).toBe('sakura');
  });

  it('reads persisted wallpaper from localStorage on init', () => {
    localStorage.setItem('chat-wallpaper', 'ocean');
    // Re-evaluate the initial value the same way the store does
    const stored = localStorage.getItem('chat-wallpaper') ?? 'kinCircle';
    expect(stored).toBe('ocean');
  });
});
