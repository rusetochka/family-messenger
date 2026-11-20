import { create } from 'zustand';
import {
  authApi, usersApi, chatsApi, messagesApi, uploadFile,
  setTokens, clearTokens, getRefreshToken, getAccessToken,
  ApiUser, ApiRejectedUser, ApiChat, ApiMessage, ApiReplyTo,
} from '../api';
import { t } from '../i18n';
import { connectSocket, disconnectSocket, getSocket } from '../socket';

// ── Domain types (kept compatible with existing components) ─────────────────
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type MessageType = 'text' | 'image' | 'emoji' | 'call';

export interface LastStatusChange {
  changedById: string | null;
  changedByName: string | null;
  changedAt: string;
  oldStatus: string | null;
  newStatus: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: number;
  status: UserStatus;
  isAdmin: boolean;
  online: boolean;
  lastSeen?: string;
  photoUrl?: string;
  readAt?: string;
  emailNotifications?: boolean;
  lastStatusChange?: LastStatusChange;
}

export interface ReplyTo {
  id: string;
  senderId: string;
  type: MessageType;
  text?: string;
  imageUrl?: string;
  emoji?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  text?: string;
  imageUrl?: string;
  emoji?: string;
  createdAt: string;
  edited?: boolean;
  replyToId?: string;
  replyTo?: ReplyTo;
  reactions?: Record<string, string[]>;
}

export interface ChatLastMessage {
  id: string;
  type: string;
  text: string | null;
  emoji: string | null;
  senderId: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  isGroup: boolean;
  name?: string;
  photoUrl?: string;
  memberIds: string[];
  createdAt: string;
  unreadCount?: number;
  lastMessage?: ChatLastMessage;
}

function mapUser(u: ApiUser): User {
  return {
    id: u.id, name: u.name, email: u.email,
    avatar: u.avatar, status: u.status,
    isAdmin: u.is_admin, online: u.online,
    lastSeen: u.last_seen ?? undefined,
    photoUrl: u.photo_url ?? undefined,
    readAt: u.read_at ?? undefined,
    emailNotifications: u.email_notifications ?? true,
  };
}

function mapRejectedUser(u: ApiRejectedUser): User {
  return {
    ...mapUser(u),
    lastStatusChange: u.log_changed_at ? {
      changedById: u.changed_by_id,
      changedByName: u.changed_by_name,
      changedAt: u.log_changed_at,
      oldStatus: u.log_old_status,
      newStatus: u.log_new_status ?? 'rejected',
    } : undefined,
  };
}

function mapChat(c: ApiChat): Chat {
  return {
    id: c.id, isGroup: c.isGroup,
    name: c.name ?? undefined,
    photoUrl: c.photoUrl ?? undefined,
    memberIds: c.members.map(m => m.id),
    createdAt: c.createdAt,
    unreadCount: c.unreadCount,
    lastMessage: c.lastMessage ?? undefined,
  };
}

function mapReplyTo(r: ApiReplyTo): ReplyTo {
  return {
    id: r.id, senderId: r.senderId, type: r.type as MessageType,
    text: r.text ?? undefined, imageUrl: r.imageUrl ?? undefined, emoji: r.emoji ?? undefined,
  };
}

function mapMessage(m: ApiMessage): Message {
  const reactions: Record<string, string[]> = {};
  for (const r of m.reactions) {
    if (!reactions[r.emoji]) reactions[r.emoji] = [];
    reactions[r.emoji].push(r.userId);
  }
  return {
    id: m.id, chatId: m.chat_id, senderId: m.sender_id, type: m.type,
    text: m.text ?? undefined, imageUrl: m.image_url ?? undefined,
    emoji: m.emoji ?? undefined, createdAt: m.created_at,
    edited: m.edited ?? false,
    replyToId: m.reply_to_id ?? undefined,
    replyTo: m.reply_to ? mapReplyTo(m.reply_to) : undefined,
    reactions,
  };
}

interface AppState {
  // Auth
  currentUser: User | null;
  authError: string | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;

  // Users
  users: User[];
  loadUsers: () => Promise<void>;
  loadPendingUsers: () => Promise<void>;
  loadRejectedUsers: () => Promise<void>;
  updateAvatar: (avatar: number, name?: string) => Promise<void>;
  updateEmailNotifications: (enabled: boolean) => Promise<void>;
  updatePhoto: (file: File) => Promise<void>;
  approveUser: (userId: string) => Promise<void>;
  rejectUser: (userId: string) => Promise<void>;

  // Chats
  chats: Chat[];
  activeChat: Chat | null;
  chatUsers: Record<string, User[]>;
  loadChats: () => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  createDM: (targetUserId: string) => Promise<Chat>;
  createGroup: (name: string, memberIds: string[]) => Promise<Chat>;
  updateGroupPhoto: (chatId: string, file: File) => Promise<void>;
  addMemberToGroup: (chatId: string, userId: string) => Promise<void>;
  removeMemberFromGroup: (chatId: string, userId: string) => Promise<void>;
  renameGroup: (chatId: string, name: string) => Promise<void>;
  deleteGroup: (chatId: string) => Promise<void>;

  // Messages
  messages: Record<string, Message[]>;
  hasMoreMessages: Record<string, boolean>;
  loadMessages: (chatId: string) => Promise<void>;
  loadMoreMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, type: MessageType, payload: { text?: string; emoji?: string; imageUrl?: string; file?: File; replyToId?: string }) => Promise<void>;
  addReaction: (chatId: string, messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  editMessage: (chatId: string, messageId: string, text: string) => Promise<void>;
  _receiveMessage: (msg: Message) => void;
  _receiveReaction: (messageId: string, chatId: string, userId: string, emoji: string) => void;
  _removeReaction: (messageId: string, chatId: string, userId: string) => void;
  _receiveMessageDeleted: (messageId: string, chatId: string) => void;
  _receiveMessageEdited: (messageId: string, chatId: string, text: string) => void;
  _setUserOnline: (userId: string, online: boolean, lastSeen?: string) => void;

  // Unread
  markAsRead: (chatId: string) => Promise<void>;

  // Wallpaper
  wallpaper: string;
  setWallpaper: (key: string) => void;

  // Calls (WebRTC signaling state)
  callStatus: 'idle' | 'incoming' | 'outgoing' | 'active';
  callPeerId: string | null;
  callType: 'audio' | 'video' | null;
  callOffer: RTCSessionDescriptionInit | null;
  callAnswer: RTCSessionDescriptionInit | null;
  callCandidates: RTCIceCandidateInit[];
  startCall: (peerId: string, callType: 'audio' | 'video') => void;
  _receiveCallOffer: (from: string, offer: RTCSessionDescriptionInit, callType: 'audio' | 'video') => void;
  _receiveCallAnswer: (answer: RTCSessionDescriptionInit) => void;
  _receiveIceCandidate: (candidate: RTCIceCandidateInit) => void;
  _receiveCallEnd: () => void;
  _setCallActive: () => void;
  _clearCall: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // ── Auth ───────────────────────────────────────────────────────────────────
  currentUser: null,
  authError: null,
  authLoading: false,

  async login(email, password) {
    set({ authLoading: true, authError: null });
    try {
      const { accessToken, refreshToken, user } = await authApi.login(email, password);
      setTokens(accessToken, refreshToken);
      const mapped = mapUser(user);
      set({ currentUser: mapped, authLoading: false });
      connectSocket(accessToken);
      await Promise.all([get().loadChats(), get().loadUsers()]);
      return true;
    } catch (err: any) {
      const detail = err.status ? `[${err.status}] ${err.message}` : `[Network] ${err.message ?? err}`;
      const msg = err.status === 403
        ? (err.message?.includes('pending') ? t('errPendingApproval') : t('errRejected'))
        : `${t('errInvalidCredentials')} (${detail})`;
      set({ authError: msg, authLoading: false });
      return false;
    }
  },

  async register(name, email, password) {
    set({ authLoading: true, authError: null });
    try {
      await authApi.register(name, email, password);
      set({ authLoading: false });
      return true;
    } catch (err: any) {
      const msg = err.status === 409 ? t('errEmailExists') : (err.message ?? t('errInvalidCredentials'));
      set({ authError: msg, authLoading: false });
      return false;
    }
  },

  async logout() {
    const refresh = getRefreshToken();
    if (refresh) await authApi.logout(refresh).catch(() => {});
    clearTokens();
    disconnectSocket();
    set({ currentUser: null, activeChat: null, chats: [], users: [], messages: {} });
  },

  async rehydrate() {
    if (!getAccessToken()) return;
    try {
      const user = await usersApi.me();
      set({ currentUser: mapUser(user) });
      connectSocket(getAccessToken()!);
      await Promise.all([get().loadChats(), get().loadUsers()]);
    } catch {
      clearTokens();
    }
  },

  // ── Users ──────────────────────────────────────────────────────────────────
  users: [],

  async loadUsers() {
    try {
      const users = await usersApi.list();
      set({ users: users.map(mapUser) });
    } catch {}
  },

  async loadPendingUsers() {
    try {
      const pending = await usersApi.pending();
      set(s => {
        const ids = new Set(pending.map(u => u.id));
        const rest = s.users.filter(u => !ids.has(u.id));
        return { users: [...rest, ...pending.map(mapUser)] };
      });
    } catch {}
  },

  async loadRejectedUsers() {
    try {
      const rejected = await usersApi.rejected();
      set(s => {
        const ids = new Set(rejected.map(u => u.id));
        const rest = s.users.filter(u => !ids.has(u.id));
        return { users: [...rest, ...rejected.map(mapRejectedUser)] };
      });
    } catch {}
  },

  async updateAvatar(avatar, name) {
    const user = await usersApi.updateMe({ avatar, ...(name ? { name } : {}) });
    const mapped = mapUser(user);
    set(s => ({
      currentUser: mapped,
      users: s.users.map(u => u.id === mapped.id ? mapped : u),
    }));
  },

  async updateEmailNotifications(enabled) {
    const user = await usersApi.updateMe({ emailNotifications: enabled });
    const mapped = mapUser(user);
    set(s => ({
      currentUser: mapped,
      users: s.users.map(u => u.id === mapped.id ? mapped : u),
    }));
  },

  async updatePhoto(file) {
    const url = await uploadFile(file);
    const user = await usersApi.updatePhoto(url);
    const mapped = mapUser(user);
    set(s => ({
      currentUser: mapped,
      users: s.users.map(u => u.id === mapped.id ? mapped : u),
    }));
  },

  async approveUser(userId) {
    await usersApi.approve(userId);
    set(s => ({ users: s.users.map(u => u.id === userId ? { ...u, status: 'approved' as UserStatus } : u) }));
  },

  async rejectUser(userId) {
    await usersApi.reject(userId);
    set(s => ({ users: s.users.map(u => u.id === userId ? { ...u, status: 'rejected' as UserStatus } : u) }));
  },

  // ── Chats ──────────────────────────────────────────────────────────────────
  chats: [],
  activeChat: null,
  chatUsers: {},

  async loadChats() {
    const apiChats = await chatsApi.list();
    const chats = apiChats.map(mapChat);
    const chatUsers: Record<string, User[]> = {};
    for (const c of apiChats) chatUsers[c.id] = c.members.map(mapUser);
    const allMembers = Object.values(chatUsers).flat();
    set(s => {
      const userMap = new Map(s.users.map(u => [u.id, u]));
      for (const u of allMembers) userMap.set(u.id, u);
      return { chats, chatUsers, users: Array.from(userMap.values()) };
    });
  },

  setActiveChat(chat) {
    set({ activeChat: chat });
  },

  async createDM(targetUserId) {
    const { chatId } = await chatsApi.createDM(targetUserId);
    await get().loadChats();
    const chat = get().chats.find(c => c.id === chatId)!;
    set({ activeChat: chat });
    return chat;
  },

  async createGroup(name, memberIds) {
    const { chatId } = await chatsApi.createGroup(name, memberIds);
    await get().loadChats();
    const chat = get().chats.find(c => c.id === chatId)!;
    set({ activeChat: chat });
    return chat;
  },

  async updateGroupPhoto(chatId, file) {
    const url = await uploadFile(file);
    await chatsApi.updatePhoto(chatId, url);
    set(s => ({
      chats: s.chats.map(c => c.id === chatId ? { ...c, photoUrl: url } : c),
      activeChat: s.activeChat?.id === chatId ? { ...s.activeChat, photoUrl: url } : s.activeChat,
    }));
  },

  async addMemberToGroup(chatId, userId) {
    await chatsApi.addMember(chatId, userId);
    set(s => {
      const updated = s.chats.map(c =>
        c.id === chatId && !c.memberIds.includes(userId)
          ? { ...c, memberIds: [...c.memberIds, userId] }
          : c
      );
      const updatedChat = updated.find(c => c.id === chatId) ?? s.activeChat;
      const newUser = s.users.find(u => u.id === userId);
      const chatUsers = { ...s.chatUsers };
      if (newUser && chatUsers[chatId] && !chatUsers[chatId].some(u => u.id === userId))
        chatUsers[chatId] = [...chatUsers[chatId], newUser];
      return { chats: updated, chatUsers, activeChat: s.activeChat?.id === chatId ? updatedChat : s.activeChat };
    });
  },

  async removeMemberFromGroup(chatId, userId) {
    await chatsApi.removeMember(chatId, userId);
    set(s => {
      const updated = s.chats.map(c =>
        c.id === chatId ? { ...c, memberIds: c.memberIds.filter(id => id !== userId) } : c
      );
      const updatedChat = updated.find(c => c.id === chatId) ?? s.activeChat;
      const chatUsers = { ...s.chatUsers };
      if (chatUsers[chatId]) chatUsers[chatId] = chatUsers[chatId].filter(u => u.id !== userId);
      return { chats: updated, chatUsers, activeChat: s.activeChat?.id === chatId ? updatedChat : s.activeChat };
    });
  },

  async renameGroup(chatId, name) {
    await chatsApi.rename(chatId, name);
    set(s => ({
      chats: s.chats.map(c => c.id === chatId ? { ...c, name } : c),
      activeChat: s.activeChat?.id === chatId ? { ...s.activeChat, name } : s.activeChat,
    }));
  },

  async deleteGroup(chatId) {
    await chatsApi.deleteGroup(chatId);
    set(s => ({
      chats: s.chats.filter(c => c.id !== chatId),
      activeChat: s.activeChat?.id === chatId ? null : s.activeChat,
      messages: Object.fromEntries(Object.entries(s.messages).filter(([k]) => k !== chatId)),
    }));
  },

  // ── Messages ───────────────────────────────────────────────────────────────
  messages: {},
  hasMoreMessages: {},

  async loadMessages(chatId) {
    const msgs = await messagesApi.list(chatId);
    set(s => ({
      messages: { ...s.messages, [chatId]: msgs.map(mapMessage) },
      hasMoreMessages: { ...s.hasMoreMessages, [chatId]: msgs.length === 50 },
    }));
  },

  async loadMoreMessages(chatId) {
    const existing = get().messages[chatId];
    if (!existing || existing.length === 0) return;
    const oldest = existing[0];
    const older = await messagesApi.list(chatId, oldest.createdAt);
    if (older.length === 0) {
      set(s => ({ hasMoreMessages: { ...s.hasMoreMessages, [chatId]: false } }));
      return;
    }
    set(s => ({
      messages: { ...s.messages, [chatId]: [...older.map(mapMessage), ...(s.messages[chatId] ?? [])] },
      hasMoreMessages: { ...s.hasMoreMessages, [chatId]: older.length === 50 },
    }));
  },

  async sendMessage(chatId, type, payload) {
    if (payload.file) {
      const imageUrl = await uploadFile(payload.file);
      const m = await messagesApi.send(chatId, { type: 'image', imageUrl, replyToId: payload.replyToId });
      get()._receiveMessage(mapMessage(m));
      return;
    }
    const m = await messagesApi.send(chatId, { type, text: payload.text, emoji: payload.emoji, imageUrl: payload.imageUrl, replyToId: payload.replyToId });
    get()._receiveMessage(mapMessage(m));
  },

  async addReaction(chatId, messageId, emoji) {
    const socket = getSocket();
    const cu = get().currentUser;
    if (!cu) return;
    const msg = get().messages[chatId]?.find(m => m.id === messageId);
    const alreadyReacted = msg?.reactions?.[emoji]?.includes(cu.id);
    if (socket?.connected) {
      if (alreadyReacted) socket.emit('reaction:remove', { messageId, chatId });
      else socket.emit('reaction:add', { messageId, emoji, chatId });
    } else {
      if (alreadyReacted) { await messagesApi.removeReaction(chatId, messageId); get()._removeReaction(messageId, chatId, cu.id); }
      else { await messagesApi.addReaction(chatId, messageId, emoji); get()._receiveReaction(messageId, chatId, cu.id, emoji); }
    }
  },

  _receiveMessage(msg) {
    set(s => {
      const existing = s.messages[msg.chatId] ?? [];
      if (existing.some(m => m.id === msg.id)) return s; // already present
      // Enrich replyTo from local state when the POST/socket payload omits the join
      let enrichedMsg = msg;
      if (msg.replyToId && !msg.replyTo) {
        const ref = existing.find(m => m.id === msg.replyToId);
        if (ref) enrichedMsg = { ...msg, replyTo: { id: ref.id, senderId: ref.senderId, type: ref.type, text: ref.text, imageUrl: ref.imageUrl, emoji: ref.emoji } };
      }
      // Bubble the chat to the top of the list and update lastMessage preview
      const updated = s.chats.map(c => c.id !== msg.chatId ? c : {
        ...c,
        unreadCount: s.activeChat?.id === msg.chatId ? 0 : (c.unreadCount ?? 0) + 1,
        lastMessage: {
          id: msg.id, type: msg.type,
          text: msg.text ?? null, emoji: msg.emoji ?? null,
          senderId: msg.senderId, createdAt: msg.createdAt,
        },
      });
      const idx = updated.findIndex(c => c.id === msg.chatId);
      const sorted = idx > 0 ? [updated[idx], ...updated.filter((_, i) => i !== idx)] : updated;
      return {
        messages: { ...s.messages, [msg.chatId]: [...existing, enrichedMsg] },
        chats: sorted,
      };
    });
  },

  _receiveReaction(messageId, chatId, userId, emoji) {
    set(s => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map(msg => {
          if (msg.id !== messageId) return msg;
          const reactions = { ...(msg.reactions ?? {}) };
          const users = reactions[emoji] ?? [];
          if (!users.includes(userId)) reactions[emoji] = [...users, userId];
          return { ...msg, reactions };
        }),
      },
    }));
  },

  _removeReaction(messageId, chatId, userId) {
    set(s => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map(msg => {
          if (msg.id !== messageId) return msg;
          const reactions = { ...(msg.reactions ?? {}) };
          for (const e of Object.keys(reactions)) {
            reactions[e] = reactions[e].filter(id => id !== userId);
            if (reactions[e].length === 0) delete reactions[e];
          }
          return { ...msg, reactions };
        }),
      },
    }));
  },

  async deleteMessage(chatId, messageId) {
    await messagesApi.deleteMessage(chatId, messageId);
    get()._receiveMessageDeleted(messageId, chatId);
  },

  async editMessage(chatId, messageId, text) {
    await messagesApi.editMessage(chatId, messageId, text);
    get()._receiveMessageEdited(messageId, chatId, text);
  },

  _receiveMessageDeleted(messageId, chatId) {
    set(s => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).filter(m => m.id !== messageId),
      },
    }));
  },

  _receiveMessageEdited(messageId, chatId, text) {
    set(s => ({
      messages: {
        ...s.messages,
        [chatId]: (s.messages[chatId] ?? []).map(m =>
          m.id === messageId ? { ...m, text, edited: true } : m
        ),
      },
    }));
  },

  _setUserOnline(userId, online, lastSeen) {
    set(s => ({ users: s.users.map(u => u.id === userId ? { ...u, online, lastSeen: lastSeen ?? u.lastSeen } : u) }));
  },

  // ── Unread ─────────────────────────────────────────────────────────────────
  async markAsRead(chatId) {
    await chatsApi.markRead(chatId).catch(() => {});
    set(s => ({ chats: s.chats.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c) }));
  },

  // ── Wallpaper ──────────────────────────────────────────────────────────────
  wallpaper: localStorage.getItem('chat-wallpaper') ?? 'none',
  setWallpaper(key) { localStorage.setItem('chat-wallpaper', key); set({ wallpaper: key }); },

  // ── Calls ──────────────────────────────────────────────────────────────────
  callStatus: 'idle',
  callPeerId: null,
  callType: null,
  callOffer: null,
  callAnswer: null,
  callCandidates: [],

  startCall(_peerId, _callType) { window.dispatchEvent(new CustomEvent('demo-notice',{detail:'Voice and video calls are available in the live product. This browser demo uses fictional people and cannot make calls.'})); },
  _receiveCallOffer(from, offer, callType) {
    const { callStatus, callPeerId, currentUser } = get();
    // Simultaneous call: we're already calling this exact person
    if (callStatus === 'outgoing' && callPeerId === from) {
      const myId = currentUser?.id ?? '';
      if (myId < from) {
        // We have the lower ID → we are the canonical caller → ignore their offer
        return;
      }
      // We have the higher ID → we become callee (they are the canonical caller)
      set({ callStatus: 'incoming', callPeerId: from, callType, callOffer: offer, callAnswer: null, callCandidates: [] });
      return;
    }
    // Already in an unrelated call → reject
    if (callStatus !== 'idle') {
      getSocket()?.emit('call:end', { to: from });
      return;
    }
    set({ callStatus: 'incoming', callPeerId: from, callType, callOffer: offer, callAnswer: null, callCandidates: [] });
  },
  _receiveCallAnswer(answer) {
    set({ callAnswer: answer });
  },
  _receiveIceCandidate(candidate) {
    set(s => ({ callCandidates: [...s.callCandidates, candidate] }));
  },
  _receiveCallEnd() {
    set({ callStatus: 'idle', callPeerId: null, callType: null, callOffer: null, callAnswer: null, callCandidates: [] });
  },
  _setCallActive() {
    set({ callStatus: 'active' });
  },
  _clearCall() {
    set({ callStatus: 'idle', callPeerId: null, callType: null, callOffer: null, callAnswer: null, callCandidates: [] });
  },
}));
