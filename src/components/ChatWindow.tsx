import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Message } from '../store/useStore';
import Avatar from './Avatar';
import MessageBubble from './MessageBubble';
import InputBar from './InputBar';
import { t, formatLastSeen } from '../i18n';
import { getWallpaperStyle } from '../wallpapers';
import { resolveMediaUrl } from '../assetUrl';

export default function ChatWindow() {
  const {
    currentUser, activeChat, messages, hasMoreMessages, users, chatUsers,
    wallpaper, markAsRead, updateGroupPhoto, addMemberToGroup, removeMemberFromGroup, loadMessages,
    loadMoreMessages, renameGroup, deleteGroup, setActiveChat, startCall,
  } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const groupPhotoRef = useRef<HTMLInputElement>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pull-to-refresh on the message list
  const msgListRef = useRef<HTMLDivElement>(null);
  const ptr = useRef({ touching: false, startY: 0, pullY: 0 });
  const [pullDisplay, setPullDisplay] = useState(0);
  const [refreshingMsgs, setRefreshingMsgs] = useState(false);
  const activeChatRef = useRef(activeChat);
  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  const loadMessagesRef = useRef(loadMessages);
  useEffect(() => { loadMessagesRef.current = loadMessages; }, [loadMessages]);
  const PTR_THRESHOLD = 50;

  useEffect(() => {
    const el = msgListRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) { ptr.current = { touching: true, startY: e.touches[0].clientY, pullY: 0 }; }
      else { ptr.current.touching = false; }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!ptr.current.touching) return;
      const delta = e.touches[0].clientY - ptr.current.startY;
      if (delta > 0) {
        ptr.current.pullY = Math.min(delta * 0.5, PTR_THRESHOLD);
        setPullDisplay(ptr.current.pullY);
      }
    };
    const onTouchEnd = async () => {
      if (!ptr.current.touching) return;
      ptr.current.touching = false;
      const reached = ptr.current.pullY >= PTR_THRESHOLD;
      ptr.current.pullY = 0;
      setPullDisplay(0);
      if (reached && activeChatRef.current) {
        setRefreshingMsgs(true);
        await loadMessagesRef.current(activeChatRef.current.id);
        setRefreshingMsgs(false);
      }
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [showAddMember, setShowAddMember] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const chatMessages = activeChat ? (messages[activeChat.id] ?? []) : [];

  // Auto-scroll when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, activeChat?.id]);

  // Reset members panel on chat switch
  useEffect(() => { setShowMembers(false); setShowAddMember(false); setShowRename(false); setShowHeaderMenu(false); setReplyingTo(null); }, [activeChat?.id]);

  // Mark as read after 3 seconds
  useEffect(() => {
    if (!activeChat) return;
    const timer = setTimeout(() => markAsRead(activeChat.id), 3000);
    return () => clearTimeout(timer);
  }, [activeChat?.id]);

  // Load messages when chat changes
  useEffect(() => {
    if (activeChat) loadMessages(activeChat.id);
  }, [activeChat?.id]);

  // Load older messages when top sentinel scrolls into view
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || !activeChat) return;
        if (!hasMoreMessages[activeChat.id]) return;
        if (loadingMore) return;
        // Preserve scroll position: record height before prepending
        const list = msgListRef.current;
        const prevScrollHeight = list?.scrollHeight ?? 0;
        setLoadingMore(true);
        await loadMoreMessages(activeChat.id);
        setLoadingMore(false);
        // Restore position so the view doesn't jump
        if (list) list.scrollTop = list.scrollHeight - prevScrollHeight;
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeChat?.id, hasMoreMessages, loadingMore]);

  function handleGroupPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    updateGroupPhoto(activeChat.id, file);
    e.target.value = '';
  }

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-100/40 text-gray-400 select-none">
        <div className="glass-card p-10 flex flex-col items-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-lg font-semibold">{t('selectChat')}</p>
          <p className="text-sm mt-1">{t('selectChatSub')}</p>
        </div>
      </div>
    );
  }

  // Determine header info
  let headerName = '';
  let headerAvatarIndex = 0;
  let headerOtherName = '';
  let headerOtherLastSeen: string | undefined;
  let headerIsGroup = false;
  let headerMemberCount = 0;
  let headerOnline = false;

  if (activeChat.isGroup) {
    headerName = activeChat.name ?? 'Group';
    headerIsGroup = true;
    headerMemberCount = activeChat.memberIds.length;
  } else {
    const otherId = activeChat.memberIds.find(id => id !== currentUser?.id);
    const other = users.find(u => u.id === otherId);
    headerName = other?.name ?? 'Unknown';
    headerOtherName = other?.name ?? '';
    headerAvatarIndex = other?.avatar ?? 0;
    headerOnline = other?.online ?? false;
    headerOtherLastSeen = other?.lastSeen;
  }

  let headerOtherPhotoUrl: string | undefined;
  if (!activeChat.isGroup) {
    const otherId = activeChat.memberIds.find(id => id !== currentUser?.id);
    headerOtherPhotoUrl = users.find(u => u.id === otherId)?.photoUrl;
  }

  const groupMembers = headerIsGroup
    ? (chatUsers[activeChat.id] ?? activeChat.memberIds.map(id => users.find(u => u.id === id)).filter(Boolean))
    : [];

  return (
    <div className="flex-1 flex min-w-0 overflow-hidden">
      {/* Chat column */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
      {/* Chat header — liquid glass */}
      <div className="glass-strong border-b border-white/30 px-3 py-2.5 flex items-center gap-2 sticky top-0 z-20">
        {/* Back arrow — mobile only */}
        <button
          onClick={() => setActiveChat(null)}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/40 text-gray-600 transition-colors flex-shrink-0"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {headerIsGroup ? (
            <div
              className="relative cursor-pointer group"
              onClick={() => groupPhotoRef.current?.click()}
              title={t('changeGroupPhoto')}
            >
              {activeChat.photoUrl ? (
                <img src={resolveMediaUrl(activeChat.photoUrl) ?? activeChat.photoUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center text-white text-xl">👥</div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <input ref={groupPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleGroupPhotoChange} />
            </div>
          ) : (
            <Avatar index={headerAvatarIndex} name={headerOtherName} size={40} photoUrl={headerOtherPhotoUrl} />
          )}
          {headerOnline && !headerIsGroup && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          )}
        </div>

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{headerName}</p>
          <p className="text-xs text-gray-400 truncate">
            {headerIsGroup
              ? `${headerMemberCount}${t('membersHint')}`
              : headerOnline ? t('online') : formatLastSeen(headerOtherLastSeen)}
          </p>
        </div>

        {/* Audio / video call buttons — DM only */}
        {!headerIsGroup && (() => {
          const otherId = activeChat.memberIds.find(id => id !== currentUser?.id);
          return otherId ? (
            <>
              <button
                onClick={() => startCall(otherId, 'audio')}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/40 text-gray-500 transition-colors flex-shrink-0"
                title={t('callAudio')}
                aria-label={t('callAudio')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.41 2 2 0 0 1 3.57 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.76a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
              <button
                onClick={() => startCall(otherId, 'video')}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/40 text-gray-500 transition-colors flex-shrink-0"
                title={t('callVideo')}
                aria-label={t('callVideo')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </button>
            </>
          ) : null;
        })()}

        {/* Three-dot menu */}
        {headerIsGroup && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowHeaderMenu(v => !v)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/40 text-gray-500 transition-colors"
              title="More"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
            {showHeaderMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 glass-card py-1 min-w-[180px]">
                  <button
                    onClick={() => { setShowMembers(v => !v); setShowHeaderMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-white/50 flex items-center gap-2"
                  >
                    {t('members')}
                  </button>
                  <button
                    onClick={() => { setShowAddMember(true); setShowMembers(true); setShowHeaderMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-white/50 flex items-center gap-2"
                  >
                    + {t('addMembers')}
                  </button>
                  <button
                    onClick={() => { setRenameValue(activeChat.name ?? ''); setShowRename(true); setShowMembers(true); setShowHeaderMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-white/50 flex items-center gap-2"
                  >
                    {t('renameGroup')}
                  </button>
                  {currentUser?.isAdmin && (
                    <button
                      onClick={() => {
                        setShowHeaderMenu(false);
                        if (window.confirm(t('confirmDeleteGroup'))) deleteGroup(activeChat.id);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/50 flex items-center gap-2"
                    >
                      {t('deleteGroup')}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Pull-to-refresh indicator for messages */}
      <div
        className="flex items-center justify-center text-rose-400 bg-white overflow-hidden transition-[height] duration-150"
        style={{ height: refreshingMsgs ? 44 : pullDisplay * (44 / PTR_THRESHOLD) }}
      >
        <svg
          className={`w-5 h-5 ${refreshingMsgs ? 'animate-spin' : ''}`}
          style={{ transform: refreshingMsgs ? undefined : `rotate(${(pullDisplay / PTR_THRESHOLD) * 180}deg)` }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Messages — wallpaper applied here */}
      <div ref={msgListRef} className="flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-4" style={getWallpaperStyle(wallpaper)}>
        <div className="flex flex-col justify-end min-h-full gap-3">
        {/* Top sentinel — triggers loading older messages */}
        <div ref={topSentinelRef} className="h-1 w-full" />
        {loadingMore && (
          <div className="flex justify-center py-1">
            <span className="text-xs text-gray-400 animate-pulse">Loading…</span>
          </div>
        )}
        {chatMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
            {t('noMessages')}
          </div>
        ) : (() => {
          // Show unread divider for messages at the start of the unread window
          const unreadCount = activeChat.unreadCount ?? 0;
          const firstUnreadIdx = unreadCount > 0 ? chatMessages.length - unreadCount : -1;
          return chatMessages.map((msg, idx) => {
            const sender = users.find(u => u.id === msg.senderId) ?? chatUsers[activeChat.id]?.find(u => u.id === msg.senderId);
            const isOwn = msg.senderId === currentUser?.id;
            const prevMsg = chatMessages[idx - 1];
            const showSender = activeChat.isGroup && (!prevMsg || prevMsg.senderId !== msg.senderId);
            return (
              <>
                {idx === firstUnreadIdx && (
                  <div key={`divider-${msg.id}`} className="flex items-center gap-2 my-1 select-none">
                    <div className="flex-1 h-px bg-rose-300" />
                    <span className="text-xs text-rose-500 font-semibold px-2 py-0.5 bg-rose-50 rounded-full border border-rose-200">
                      {t('unreadMessages')}
                    </span>
                    <div className="flex-1 h-px bg-rose-300" />
                  </div>
                )}
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  sender={sender}
                  isOwn={isOwn}
                  showSender={showSender}
                  isFirst={idx === 0}
                  onReply={setReplyingTo}
                />
              </>
            );
          });
        })()}
        <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <InputBar chatId={activeChat.id} replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} />
      </div>

      {/* Group members panel */}
      {headerIsGroup && showMembers && (
        <div className="w-64 flex-shrink-0 glass-strong border-l border-white/30 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">{t('members')} ({headerMemberCount})</h3>
            <button
              onClick={() => setShowMembers(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
              title="Close"
            >
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {groupMembers.map(member => {
              if (!member) return null;
              return (
                <div key={member.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="relative flex-shrink-0">
                    <Avatar index={member.avatar} name={member.name} size={36} photoUrl={member.photoUrl} />
                    {member.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {member.name}
                      {member.id === currentUser?.id && <span className="text-rose-500 text-xs ml-1">({t('you')})</span>}
                    </p>
                    <p className={`text-xs ${member.online ? 'text-green-500' : 'text-gray-400'}`}>
                      {member.online ? t('online') : formatLastSeen(member.lastSeen)}
                    </p>
                  </div>
                  {member.isAdmin && (
                    <span className="ml-auto text-xs bg-rose-100 text-rose-600 font-semibold px-1.5 py-0.5 rounded">
                      {t('admin')}
                    </span>
                  )}
                  {currentUser?.isAdmin && member.id !== currentUser.id && !member.isAdmin && (
                    <button
                      onClick={() => {
                        if (window.confirm(`${t('removeFromGroup')} ${member.name}?`)) {
                          removeMemberFromGroup(activeChat!.id, member.id);
                        }
                      }}
                      className="ml-auto text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      title={t('removeFromGroup')}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {/* Add member + Rename + Delete */}
          <div className="border-t border-gray-100 p-3 flex-shrink-0 space-y-2">
            {/* Add member */}
            {showAddMember ? (() => {
              const eligibleToAdd = users.filter(
                u => u.status === 'approved' && !activeChat.memberIds.includes(u.id),
              );
              return (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">{t('addMembers')}</p>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {eligibleToAdd.length === 0 ? (
                      <p className="text-xs text-gray-400 py-1">{t('noUsersToAdd')}</p>
                    ) : eligibleToAdd.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { addMemberToGroup(activeChat.id, u.id); setShowAddMember(false); }}
                        className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-rose-50 text-left transition-colors"
                      >
                        <Avatar index={u.avatar} name={u.name} size={28} photoUrl={u.photoUrl} />
                        <span className="text-sm text-gray-700 truncate">{u.name}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowAddMember(false)}
                    className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              );
            })() : (
              <button
                onClick={() => setShowAddMember(true)}
                className="w-full text-sm text-rose-600 font-semibold py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
              >
                + {t('addMembers')}
              </button>
            )}

            {/* Rename group */}
            {showRename ? (
              <div className="flex gap-1">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && renameValue.trim()) {
                      renameGroup(activeChat.id, renameValue.trim());
                      setShowRename(false);
                    }
                    if (e.key === 'Escape') setShowRename(false);
                  }}
                  placeholder={t('newGroupNamePlaceholder')}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <button
                  onClick={() => { if (renameValue.trim()) { renameGroup(activeChat.id, renameValue.trim()); setShowRename(false); } }}
                  className="text-sm bg-rose-500 text-white px-2 py-1 rounded-lg hover:bg-rose-600 transition-colors"
                >✓</button>
                <button
                  onClick={() => setShowRename(false)}
                  className="text-sm text-gray-400 hover:text-gray-600 px-1"
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setRenameValue(activeChat.name ?? ''); setShowRename(true); setShowAddMember(false); }}
                className="w-full text-sm text-gray-500 font-medium py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left px-2"
              >
                ✏️ {t('renameGroup')}
              </button>
            )}

            {/* Delete group — admin only */}
            {currentUser?.isAdmin && (
              <button
                onClick={() => {
                  if (window.confirm(t('confirmDeleteGroup'))) {
                    deleteGroup(activeChat.id);
                  }
                }}
                className="w-full text-sm text-red-500 font-medium py-1.5 rounded-lg hover:bg-red-50 transition-colors text-left px-2"
              >
                🗑 {t('deleteGroup')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
