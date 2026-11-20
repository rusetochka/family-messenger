import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, Chat } from '../store/useStore';
import Avatar from './Avatar';
import NewGroupModal from './NewGroupModal';
import { t } from '../i18n';
import { hasSeenPhotosHighlight, hasNewPhotoBadge } from './PhotosTooltip';
import SakuraPetals from './SakuraPetals';
import { isSakuraSeason, hasSeenSakuraTooltip } from './SakuraTooltip';
import { resolveMediaUrl } from '../assetUrl';

export default function Sidebar() {
  const { currentUser, chats, messages, users, setActiveChat, activeChat, createDM, loadChats, loadUsers, deleteGroup } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [chatMenuId, setChatMenuId] = useState<string | null>(null);
  const [showPhotosPulse, setShowPhotosPulse] = useState(() => !hasSeenPhotosHighlight());
  const [showPhotoBadge, setShowPhotoBadge] = useState(() => hasNewPhotoBadge());
  const [showSakuraPetals, setShowSakuraPetals] = useState(false);
  const [sakuraKey, setSakuraKey] = useState(0);
  const [showSakuraPulse, setShowSakuraPulse] = useState(() => isSakuraSeason() && !hasSeenSakuraTooltip());

  useEffect(() => {
    const handler = () => setShowSakuraPulse(false);
    window.addEventListener('sakura-tooltip-dismissed', handler);
    return () => window.removeEventListener('sakura-tooltip-dismissed', handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowPhotosPulse(false);
    window.addEventListener('photos-highlight-dismissed', handler);
    return () => window.removeEventListener('photos-highlight-dismissed', handler);
  }, []);

  useEffect(() => {
    const onUpdated = () => setShowPhotoBadge(hasNewPhotoBadge());
    const onVisited = () => setShowPhotoBadge(false);
    window.addEventListener('photos-badge-updated', onUpdated);
    window.addEventListener('photos-visited', onVisited);
    return () => {
      window.removeEventListener('photos-badge-updated', onUpdated);
      window.removeEventListener('photos-visited', onVisited);
    };
  }, []);

  // Pull-to-refresh — all mutable values in refs so the effect runs only once
  const listRef = useRef<HTMLDivElement>(null);
  const touching = useRef(false);
  const touchStartY = useRef(0);
  const pullYRef = useRef(0);
  const [pullDisplay, setPullDisplay] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const loadChatsRef = useRef(loadChats);
  const loadUsersRef = useRef(loadUsers);
  useEffect(() => { loadChatsRef.current = loadChats; }, [loadChats]);
  useEffect(() => { loadUsersRef.current = loadUsers; }, [loadUsers]);
  const THRESHOLD = 50;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        touching.current = true;
        touchStartY.current = e.touches[0].clientY;
      } else {
        touching.current = false;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touching.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) {
        const y = Math.min(delta * 0.5, THRESHOLD);
        pullYRef.current = y;
        setPullDisplay(y);
      }
    };
    const onTouchEnd = async () => {
      if (!touching.current) return;
      touching.current = false;
      const reached = pullYRef.current >= THRESHOLD;
      pullYRef.current = 0;
      setPullDisplay(0);
      if (reached) {
        setRefreshing(true);
        await Promise.all([loadChatsRef.current(), loadUsersRef.current()]);
        setRefreshing(false);
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

  if (!currentUser) return null;

  const myChats = chats.filter(c => c.memberIds.includes(currentUser.id));

  function getChatDisplay(chat: Chat) {
    if (chat.isGroup) {
      return { name: chat.name ?? 'Group', avatarIndex: 14, isOnline: false };
    }
    const otherId = chat.memberIds.find(id => id !== currentUser?.id)!;
    const other = users.find(u => u.id === otherId);
    return { name: other?.name ?? 'Unknown', avatarIndex: other?.avatar ?? 0, isOnline: other?.online ?? false, photoUrl: other?.photoUrl };
  }

  function getLastMessage(chat: Chat) {
    const msgs = messages[chat.id];
    if (msgs && msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      if (last.type === 'image') return t('photo');
      if (last.type === 'emoji') return last.emoji ?? '😊';
      if (last.type === 'call') return '📞 Call';
      return last.text ?? '';
    }
    // Fall back to the server-provided preview (populated on initial load)
    if (chat.lastMessage) {
      if (chat.lastMessage.type === 'image') return t('photo');
      if (chat.lastMessage.type === 'emoji') return chat.lastMessage.emoji ?? '😊';
      if (chat.lastMessage.type === 'call') return '📞 Call';
      return chat.lastMessage.text ?? '';
    }
    return t('noMessagesYet');
  }

  function getUnreadCount(chat: Chat): number {
    if (activeChat?.id === chat.id) return 0;
    return chat.unreadCount ?? 0;
  }

  const eligibleForDM = users.filter(
    u => u.status === 'approved' && u.id !== currentUser.id &&
      !chats.some(c => !c.isGroup && c.memberIds.includes(currentUser.id) && c.memberIds.includes(u.id)),
  );

  const filteredChats = myChats.filter(chat => {
    const { name } = getChatDisplay(chat);
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <aside className="flex flex-col h-full glass-strong w-full md:w-72 flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-white/30">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-800">{t('chats')}</h1>
            <div className="flex gap-1">
              <button
                onClick={() => setShowUserSearch(v => !v)}
                className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title={t('newDM')}
                data-onboarding="new-dm"
              >
                {/* Compose / new message */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={() => setShowGroupModal(true)}
                className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title={t('newGroup')}
                data-onboarding="new-group"
              >
                {/* New group */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <circle cx="9" cy="7" r="3" />
                  <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="16" y1="11" x2="22" y2="11" />
                </svg>
              </button>
            </div>
          </div>
          <input
            type="text"
            placeholder={t('searchChats')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/40 rounded-full px-4 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-rose-400 border border-white/30 placeholder-gray-400"
            data-onboarding="search"
          />
        </div>

        {/* New DM user list */}
        {showUserSearch && (
          <div className="border-b border-white/30 bg-rose-50/60 p-3 space-y-1">
            <p className="text-xs font-semibold text-rose-600 mb-2">{t('startConversation')}</p>
            {eligibleForDM.length === 0 ? (
              <p className="text-xs text-gray-400 italic">{t('allHaveDM')}</p>
            ) : (
              eligibleForDM.map(u => (
                <button
                  key={u.id}
                  onClick={() => { createDM(u.id); setShowUserSearch(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-rose-100 transition-colors"
                >
                    <Avatar index={u.avatar} name={u.name} size={28} photoUrl={u.photoUrl} />
                  <span className="text-sm text-gray-700">{u.name}</span>
                  {u.online && <span className="ml-auto w-2 h-2 rounded-full bg-green-400" />}
                </button>
              ))
            )}
          </div>
        )}

        {/* Pull-to-refresh indicator — outside the scroll container so it's never clipped */}
        <div
          className="flex items-center justify-center text-rose-400 overflow-hidden transition-[height] duration-150"
          style={{ height: refreshing ? 44 : pullDisplay * (44 / THRESHOLD) }}
        >
          <svg
            className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: refreshing ? undefined : `rotate(${(pullDisplay / THRESHOLD) * 180}deg)` }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Chat list */}
        <div ref={listRef} className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center mt-8">{t('noChatsFound')}</p>
          ) : (
            filteredChats.map(chat => {
              const { name, avatarIndex, isOnline, photoUrl: chatPhotoUrl } = getChatDisplay(chat);
              const lastMsg = getLastMessage(chat);
              const isActive = activeChat?.id === chat.id;
              const unread = getUnreadCount(chat);
              const menuOpen = chatMenuId === chat.id;
              return (
                <div
                  key={chat.id}
                  className={`relative flex items-center gap-3 px-4 py-3 border-b border-white/20 transition-colors ${
                    isActive ? 'bg-rose-100/50' : 'hover:bg-white/40'
                  }`}
                >
                  {/* Clickable chat row */}
                  <button
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    onClick={() => { setActiveChat(chat); setChatMenuId(null); }}
                  >
                  <div className="relative flex-shrink-0">
                    {chat.isGroup ? (
                      chat.photoUrl ? (
                        <img src={resolveMediaUrl(chat.photoUrl) ?? chat.photoUrl} className="rounded-full object-cover" style={{ width: 52, height: 52 }} alt="" />
                      ) : (
                        <div className="rounded-full bg-rose-500 flex items-center justify-center text-white text-xl" style={{ width: 52, height: 52 }}>👥</div>
                      )
                    ) : (
                      <Avatar index={avatarIndex} name={name} size={52} photoUrl={chatPhotoUrl} />
                    )}
                    {isOnline && !chat.isGroup && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base truncate ${unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>{name}</p>
                    <p className={`text-sm truncate ${unread > 0 ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>{lastMsg}</p>
                  </div>
                  {unread > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                  </button>

                  {/* ⋯ menu button — admin only */}
                  {currentUser?.isAdmin && (
                    <button
                      onClick={e => { e.stopPropagation(); setChatMenuId(menuOpen ? null : chat.id); }}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                      title="More"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                      </svg>
                    </button>
                  )}

                  {/* Dropdown menu */}
                  {menuOpen && (
                    <>
                      {/* click-away backdrop */}
                      <div className="fixed inset-0 z-10" onClick={() => setChatMenuId(null)} />
                      <div className="absolute right-2 top-full mt-0.5 z-20 glass-card py-1 min-w-[160px]">
                        {currentUser?.isAdmin && (
                          <button
                            onClick={() => {
                              setChatMenuId(null);
                              const key = chat.isGroup ? t('confirmDeleteGroup') : t('confirmDeleteChat');
                              if (window.confirm(key)) deleteGroup(chat.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                            </svg>
                            {chat.isGroup ? t('deleteGroup') : t('deleteChat')}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom nav */}
        <div className="glass-strong border-t border-white/30 px-5 pt-4 pb-6 flex items-center gap-3 safe-bottom">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 flex-1 min-w-0 rounded-xl hover:bg-white/40 transition-colors p-1.5 -ml-1.5"
            data-onboarding="profile-btn"
          >
            <Avatar index={currentUser.avatar} name={currentUser.name} size={36} photoUrl={currentUser.photoUrl} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{currentUser.name}</p>
            </div>
          </button>
          {/* Photo of the Day */}
          <button
            onClick={() => { setShowPhotosPulse(false); navigate('/photos'); }}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-rose-100/60 hover:bg-rose-200/70 text-rose-600 transition-colors flex-shrink-0"
            title={t('photosOfDayNav')}
            data-onboarding="photos-btn"
          >
            {showPhotosPulse && (
              <>
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500" />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-400 animate-ping" />
              </>
            )}
            {!showPhotosPulse && showPhotoBadge && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          {/* Sakura seasonal button — visible only during sakura season */}
          {isSakuraSeason() && (
            <button
              onClick={() => { setSakuraKey(k => k + 1); setShowSakuraPetals(true); }}
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-pink-100/60 hover:bg-pink-200/70 text-pink-500 transition-colors flex-shrink-0"
              title={t('sakuraTitle')}
              data-onboarding="sakura-btn"
            >
              {showSakuraPulse && (
                <>
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-pink-400" />
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-pink-300 animate-ping" />
                </>
              )}
              {/* Sakura flower SVG */}
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <path d="M12 2a2.5 2.5 0 0 1 2.45 2h.05a2.5 2.5 0 1 1 1.5 4.74A2.5 2.5 0 0 1 14.5 12a2.5 2.5 0 0 1 1.5 3.26 2.5 2.5 0 1 1-1.5 4.74h-.05A2.5 2.5 0 1 1 9.55 18H9.5a2.5 2.5 0 1 1-1.5-4.74A2.5 2.5 0 0 1 9.5 12a2.5 2.5 0 0 1-1.5-3.26 2.5 2.5 0 1 1 1.5-4.74h.05A2.5 2.5 0 0 1 12 2z" opacity="0.3"/>
                <circle cx="12" cy="12" r="2.2"/>
                <ellipse cx="12" cy="5.5" rx="1.6" ry="2.6"/>
                <ellipse cx="17.5" cy="8.8" rx="1.6" ry="2.6" transform="rotate(72 17.5 8.8)"/>
                <ellipse cx="15.3" cy="15.5" rx="1.6" ry="2.6" transform="rotate(144 15.3 15.5)"/>
                <ellipse cx="8.7" cy="15.5" rx="1.6" ry="2.6" transform="rotate(216 8.7 15.5)"/>
                <ellipse cx="6.5" cy="8.8" rx="1.6" ry="2.6" transform="rotate(288 6.5 8.8)"/>
              </svg>
            </button>
          )}
          {currentUser.isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-rose-100/60 hover:bg-rose-200/70 text-rose-600 transition-colors flex-shrink-0"
              title={t('adminPanel')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              {(() => {
                const pendingCount = users.filter(u => u.status === 'pending').length;
                return pendingCount > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                ) : null;
              })()}
            </button>
          )}
        </div>
      </aside>

      {showGroupModal && <NewGroupModal onClose={() => setShowGroupModal(false)} />}
      {showSakuraPetals && <SakuraPetals key={sakuraKey} onDone={() => setShowSakuraPetals(false)} />}
    </>
  );
}
