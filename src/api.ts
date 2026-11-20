import {demoRequest, demoUpload} from './demo-client';
// ── Token storage ────────────────────────────────────────────────────────────
export function getAccessToken()  { return localStorage.getItem('accessToken'); }
export function getRefreshToken() { return localStorage.getItem('refreshToken'); }
export function setTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}
export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function request<T>(path:string, options:RequestInit={}):Promise<T>{ return demoRequest<T>(path,options); }

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login(email: string, password: string) {
    return request<{ accessToken: string; refreshToken: string; user: ApiUser }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    );
  },
  register(name: string, email: string, password: string) {
    const locale = navigator.language.startsWith('ru') ? 'ru' : 'en';
    return request<{ user: ApiUser }>(
      '/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, locale }) }
    );
  },
  logout(refreshToken: string) {
    return request<void>(
      '/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }
    );
  },
};

// ── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list()                              { return request<ApiUser[]>('/users'); },
  me()                                { return request<ApiUser>('/users/me'); },
  pending()                           { return request<ApiUser[]>('/users/pending'); },
  updateMe(body: { name?: string; avatar?: number; emailNotifications?: boolean }) {
    return request<ApiUser>('/users/me', { method: 'PATCH', body: JSON.stringify(body) });
  },
  updatePhoto(photoUrl: string) {
    return request<ApiUser>('/users/me/photo', { method: 'PATCH', body: JSON.stringify({ photoUrl }) });
  },
  rejected()          { return request<ApiRejectedUser[]>('/users/rejected'); },
  approve(id: string) { return request<ApiUser>(`/users/${id}/approve`, { method: 'POST' }); },
  reject(id: string)  { return request<ApiUser>(`/users/${id}/reject`,  { method: 'POST' }); },
};

// ── Chats ────────────────────────────────────────────────────────────────────
export const chatsApi = {
  list()                              { return request<ApiChat[]>('/chats'); },
  createDM(targetUserId: string)      { return request<{ chatId: string }>('/chats/dm', { method: 'POST', body: JSON.stringify({ targetUserId }) }); },
  createGroup(name: string, memberIds: string[]) {
    return request<{ chatId: string }>('/chats/group', { method: 'POST', body: JSON.stringify({ name, memberIds }) });
  },
  updatePhoto(chatId: string, photoUrl: string) {
    return request<ApiChat>(`/chats/${chatId}/photo`, { method: 'PATCH', body: JSON.stringify({ photoUrl }) });
  },
  addMember(chatId: string, userId: string) {
    return request<void>(`/chats/${chatId}/members`, { method: 'POST', body: JSON.stringify({ userId }) });
  },
  removeMember(chatId: string, userId: string) {
    return request<void>(`/chats/${chatId}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  },
  markRead(chatId: string) {
    return request<void>(`/chats/${chatId}/read`, { method: 'POST' });
  },
  rename(chatId: string, name: string) {
    return request<{ id: string; name: string }>(`/chats/${chatId}/name`, { method: 'PATCH', body: JSON.stringify({ name }) });
  },
  deleteGroup(chatId: string) {
    return request<void>(`/chats/${chatId}`, { method: 'DELETE' });
  },
};

// ── Messages ─────────────────────────────────────────────────────────────────
export const messagesApi = {
  list(chatId: string, before?: string) {
    const q = before ? `?before=${encodeURIComponent(before)}` : '';
    return request<ApiMessage[]>(`/chats/${chatId}/messages${q}`);
  },
  send(chatId: string, body: { type: string; text?: string; imageUrl?: string; emoji?: string; replyToId?: string }) {
    return request<ApiMessage>(`/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify(body) });
  },
  addReaction(chatId: string, messageId: string, emoji: string) {
    return request<void>(`/chats/${chatId}/messages/${messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) });
  },
  removeReaction(chatId: string, messageId: string) {
    return request<void>(`/chats/${chatId}/messages/${messageId}/reactions`, { method: 'DELETE' });
  },
  deleteMessage(chatId: string, messageId: string) {
    return request<void>(`/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' });
  },
  editMessage(chatId: string, messageId: string, text: string) {
    return request<ApiMessage>(`/chats/${chatId}/messages/${messageId}`, { method: 'PATCH', body: JSON.stringify({ text }) });
  },
};

// ── Upload ────────────────────────────────────────────────────────────────────
export async function uploadFile(file:File):Promise<string>{return demoUpload(file);}

// ── API types ────────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  avatar: number;
  photo_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  is_admin: boolean;
  online: boolean;
  last_seen: string | null;
  read_at?: string | null;
  created_at?: string;
  email_notifications?: boolean;
}

export interface ApiRejectedUser extends ApiUser {
  log_old_status: string | null;
  log_new_status: string | null;
  log_changed_at: string | null;
  changed_by_id: string | null;
  changed_by_name: string | null;
}

export interface ApiChat {
  id: string;
  isGroup: boolean;
  name: string | null;
  photoUrl: string | null;
  createdAt: string;
  unreadCount: number;
  members: ApiUser[];
  lastMessage: {
    id: string; type: string; text: string | null;
    emoji: string | null; senderId: string; createdAt: string;
  } | null;
}

export interface ApiReaction { userId: string; emoji: string; }

export interface ApiReplyTo {
  id: string;
  senderId: string;
  type: 'text' | 'image' | 'emoji';
  text: string | null;
  imageUrl: string | null;
  emoji: string | null;
}

export interface ApiMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  type: 'text' | 'image' | 'emoji';
  text: string | null;
  image_url: string | null;
  emoji: string | null;
  created_at: string;
  edited: boolean;
  reply_to_id: string | null;
  reply_to: ApiReplyTo | null;
  reactions: ApiReaction[];
}

export interface ApiInvitation {
  id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

// ── Push ──────────────────────────────────────────────────────────────────────
export const pushApi = {
  getVapidKey(): Promise<{ key: string }> {
    return request<{ key: string }>('/push/vapid-public-key');
  },
  subscribe(subscription: object): Promise<void> {
    return request<void>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    });
  },
};

// ── Invitations ───────────────────────────────────────────────────────────────
export const invitationsApi = {
  create() {
    return request<ApiInvitation>('/invitations', { method: 'POST' });
  },
  validate(token: string) {
    return request<{ valid: boolean }>(`/invitations/${encodeURIComponent(token)}`);
  },
  accept(token: string, name: string, email: string, password: string) {
    return request<{ user: ApiUser }>(
      `/invitations/${encodeURIComponent(token)}/accept`,
      { method: 'POST', body: JSON.stringify({ name, email, password }) },
    );
  },
};

// ── Photo of the Day ──────────────────────────────────────────────────────────
export interface ApiPhoto {
  id: string;
  title: string;
  photo_url: string;
  created_at: string;
  author_name: string;
}

export const photosApi = {
  list()                                        { return request<ApiPhoto[]>('/photos'); },
  add(title: string, photoUrl: string)          { return request<ApiPhoto>('/photos', { method: 'POST', body: JSON.stringify({ title, photoUrl }) }); },
  remove(id: string)                            { return request<void>(`/photos/${encodeURIComponent(id)}`, { method: 'DELETE' }); },
};
