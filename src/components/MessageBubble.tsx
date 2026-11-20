import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Message, User } from '../store/useStore';
import Avatar from './Avatar';
import { useStore } from '../store/useStore';
import { t, formatMessageTime } from '../i18n';
import { resolveMediaUrl, mediaUrlForFetch, isTrustedMediaFetchUrl } from '../assetUrl';

interface Props {
  message: Message;
  sender: User | undefined;
  isOwn: boolean;
  showSender: boolean;
  isFirst?: boolean;
  onReply?: (message: Message) => void;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface LightboxProps {
  url: string;
  onClose: () => void;
  onDownload: (url: string) => void;
}

/** Full-screen image lightbox rendered into document.body */
function ImageLightbox({ url, onClose, onDownload }: LightboxProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <img
        src={url}
        alt=""
        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      <button
        className="mt-5 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
        onClick={e => { e.stopPropagation(); onDownload(url); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M12 3v13M7 11l5 5 5-5"/>
          <path d="M5 21h14"/>
        </svg>
        {t('downloadImage')}
      </button>
      <button
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>,
    document.body,
  );
}

/** Single gray tick = sent. Double gray = delivered. Double rose = read. */
function MessageTicks({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const { chatUsers, chats, currentUser } = useStore();
  if (!isOwn) return null;

  const chat = chats.find(c => c.id === message.chatId);
  if (!chat) return null;

  // Only for DMs — group read-receipt tracking is omitted for simplicity
  if (chat.isGroup) {
    return (
      <svg viewBox="0 0 16 10" className="inline-block w-4 h-2.5 ml-0.5 text-gray-400 fill-current flex-shrink-0" aria-hidden>
        <path d="M1 5l3 3L13 1" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  const members = chatUsers[message.chatId] ?? [];
  const other = members.find(u => u.id !== currentUser?.id);

  const isRead = other?.readAt != null && other.readAt >= message.createdAt;

  return isRead ? (
    // Double rose tick — read
    <svg viewBox="0 0 22 10" className="inline-block w-5 h-2.5 ml-0.5 flex-shrink-0" aria-hidden>
      <path d="M1 5l3 3L13 1"      stroke="#e11d48" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 5l3 3L18 1"      stroke="#e11d48" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ) : (
    // Double gray tick — sent (we treat "in DB" as delivered)
    <svg viewBox="0 0 22 10" className="inline-block w-5 h-2.5 ml-0.5 text-gray-400 flex-shrink-0" aria-hidden>
      <path d="M1 5l3 3L13 1"      stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 5l3 3L18 1"      stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function MessageBubble({ message, sender, isOwn, showSender, isFirst, onReply }: Props) {
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0);
  const [hovered, setHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.text ?? '');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [bubbleRect, setBubbleRect] = useState<DOMRect | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const menuOpenTime = useRef(0);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const handleMouseEnter = () => { clearTimeout(leaveTimer.current); setHovered(true); };
  const handleMouseLeave = () => { leaveTimer.current = setTimeout(() => setHovered(false), 150); };
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      menuOpenTime.current = Date.now();
      setBubbleRect(bubbleRef.current?.getBoundingClientRect() ?? null);
      setContextMenuOpen(true);
      navigator.vibrate?.(40);
    }, 500);
  };
  const handleTouchEnd = () => clearTimeout(longPressTimer.current);
  const handleTouchMove = () => clearTimeout(longPressTimer.current);
  const { currentUser, addReaction, deleteMessage, editMessage, users, chatUsers } = useStore();
  const isEmojiOnly = message.type === 'emoji';
  const imageSrc =
    message.imageUrl != null && message.imageUrl !== ''
      ? (resolveMediaUrl(message.imageUrl) ?? message.imageUrl)
      : undefined;

  // Look up the sender of the replied-to message
  const replyToSender = message.replyTo
    ? (users.find(u => u.id === message.replyTo!.senderId) ?? chatUsers[message.chatId]?.find(u => u.id === message.replyTo!.senderId))
    : undefined;

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  // Close context menu on scroll
  useEffect(() => {
    if (!contextMenuOpen) return;
    const close = () => setContextMenuOpen(false);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [contextMenuOpen]);

  async function downloadImage(url: string) {
    const resolved = mediaUrlForFetch(url);
    if (!isTrustedMediaFetchUrl(resolved)) return;
    try {
      const res = await fetch(resolved);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = resolved.split('/').pop()?.replace(/[^a-zA-Z0-9._-]/g, '') || 'image';
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      // No fallback to window.open to avoid redirect to untrusted URLs
    }
  }

  const reactionEntries = Object.entries(message.reactions ?? {});

  // Reply quote block
  const replyQuote = message.replyTo && (
    <div
      className={`mb-1.5 border-l-2 border-rose-400 pl-2 py-1 pr-2 rounded-r text-xs max-w-full
        ${isOwn ? 'bg-white/20 text-white/80' : 'bg-black/5 text-gray-500'}`}
      data-testid="reply-quote"
    >
      <span className={`font-semibold block truncate ${isOwn ? 'text-white' : 'text-rose-500'}`}>
        {replyToSender?.name ?? message.replyTo.senderId}
      </span>
      <span className="line-clamp-2 break-words">
        {message.replyTo.type === 'image' ? t('photo')
          : message.replyTo.type === 'emoji' ? (message.replyTo.emoji ?? '')
          : (message.replyTo.text ?? '')}
      </span>
    </div>
  );

  // Inline action strip — desktop hover only; touch devices use long-press context menu
  const actionStrip = !isTouchDevice && hovered && !editing && (
    <div
      className="relative flex items-center gap-0.5 flex-shrink-0 self-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {REACTION_EMOJIS.map(e => (
        <button
          key={e}
          onMouseDown={ev => { ev.preventDefault(); addReaction(message.chatId, message.id, e); }}
          className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 transition-transform leading-none rounded-full hover:bg-gray-100"
          title={e}
        >
          {e}
        </button>
      ))}
      <button
        onMouseDown={ev => { ev.preventDefault(); onReply?.(message); }}
        className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-rose-500 rounded-full hover:bg-gray-100"
        title={t('reply')}
        aria-label={t('reply')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <polyline points="9 17 4 12 9 7"/>
          <path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
        </svg>
      </button>
      {isOwn && (
        <>
          <button
            onMouseDown={ev => { ev.preventDefault(); setShowMenu(v => !v); }}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 text-base leading-none"
            title="More"
          >
            ···
          </button>
          {showMenu && (
            <div
              className={`absolute ${isFirst ? 'top-full mt-1' : 'bottom-full mb-1'} right-0 z-30 glass-card py-1 min-w-[120px]`}
              onMouseLeave={() => setShowMenu(false)}
            >
              {message.type === 'text' && (
                <button
                  onClick={() => { setEditText(message.text ?? ''); setEditing(true); setShowMenu(false); setHovered(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  ✏️ {t('editMessage')}
                </button>
              )}
              <button
                onClick={() => {
                  if (window.confirm(t('confirmDeleteMessage'))) {
                    deleteMessage(message.chatId, message.id);
                  }
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                🗑 {t('deleteMessage')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Long-press context menu portal
  const contextPanel = contextMenuOpen && bubbleRect && createPortal(
    (() => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const PANEL_W = 260;
      const EMOJI_H = 60;
      const numActions = 1 + (isOwn && message.type === 'text' ? 1 : 0) + (isOwn ? 1 : 0);
      const ACTIONS_H = numActions * 52 + 4;
      const TOTAL_H = EMOJI_H + 8 + ACTIONS_H;
      const cx = bubbleRect.left + bubbleRect.width / 2;
      const panelLeft = Math.max(8, Math.min(cx - PANEL_W / 2, W - PANEL_W - 8));
      const spaceBelow = H - bubbleRect.bottom - 8;
      const panelTop = spaceBelow >= TOTAL_H + 8
        ? bubbleRect.bottom + 8
        : Math.max(8, bubbleRect.top - TOTAL_H - 8);

      return (
        <>
          {/* Blurred dark backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (Date.now() - menuOpenTime.current > 300) setContextMenuOpen(false); }}
          />

          {/* Message clone — highlighted above the backdrop */}
          <div
            className="fixed z-[51] pointer-events-none"
            style={{ top: bubbleRect.top, left: bubbleRect.left, width: bubbleRect.width }}
          >
            <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
              {!isOwn && (
                <Avatar index={sender?.avatar ?? 0} name={sender?.name} size={28} photoUrl={sender?.photoUrl} />
              )}
              {isEmojiOnly ? (
                <span className="text-5xl px-2">{message.emoji}</span>
              ) : message.type === 'image' && imageSrc ? (
                <div className={`rounded-2xl overflow-hidden shadow-2xl ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`} style={{ maxWidth: 200 }}>
                  <img src={imageSrc} alt="" className="block w-full" style={{ maxHeight: 180 }} />
                </div>
              ) : (
                <div
                  className={`px-4 py-2.5 rounded-2xl text-base leading-relaxed shadow-2xl ring-2 ring-white/30 ${
                    isOwn ? 'glass-bubble-own text-white rounded-br-sm' : 'glass-bubble text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {replyQuote}
                  {message.text}
                </div>
              )}
            </div>
          </div>

          {/* Emoji strip + action list — anchored near the message */}
          <div
            className="fixed z-[51] flex flex-col gap-2"
            style={{ top: panelTop, left: panelLeft, width: PANEL_W }}
            onClick={e => e.stopPropagation()}
          >
            {/* Emoji strip */}
            <div className="flex bg-white rounded-full shadow-2xl px-2 py-1.5 gap-0.5 border border-gray-100 justify-center">
              {REACTION_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  className="w-10 h-10 flex items-center justify-center text-2xl active:scale-125 transition-transform"
                  onClick={() => { addReaction(message.chatId, message.id, emoji); setContextMenuOpen(false); }}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {/* Action list */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
              <button
                className="w-full text-left px-4 py-3.5 text-sm text-gray-800 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50"
                onClick={() => { onReply?.(message); setContextMenuOpen(false); }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0 text-gray-500">
                  <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                </svg>
                {t('reply')}
              </button>
              {isOwn && message.type === 'text' && (
                <button
                  className="w-full text-left px-4 py-3.5 text-sm text-gray-800 flex items-center gap-3 border-b border-gray-100 active:bg-gray-50"
                  onClick={() => { setEditText(message.text ?? ''); setEditing(true); setContextMenuOpen(false); }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0 text-gray-500">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  {t('editMessage')}
                </button>
              )}
              {isOwn && (
                <button
                  className="w-full text-left px-4 py-3.5 text-sm text-red-600 flex items-center gap-3 active:bg-red-50"
                  onClick={() => {
                    if (window.confirm(t('confirmDeleteMessage'))) deleteMessage(message.chatId, message.id);
                    setContextMenuOpen(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                  {t('deleteMessage')}
                </button>
              )}
            </div>
          </div>
        </>
      );
    })(),
    document.body,
  );

  // Reactions row (below bubble)
  const reactionsRow = reactionEntries.length > 0 && (
    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {reactionEntries.map(([emoji, userIds]) => {
        const mine = userIds.includes(currentUser?.id ?? '');
        return (
          <button
            key={emoji}
            onClick={() => addReaction(message.chatId, message.id, emoji)}
            className={`text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border transition-colors
              ${mine ? 'bg-rose-100 border-rose-300 text-rose-700' : 'bg-gray-100 border-gray-200 text-gray-600'}
              hover:border-rose-400`}
            title={mine ? t('removeReaction') : t('react')}
          >
            <span>{emoji}</span>
            <span className="font-semibold">{userIds.length}</span>
          </button>
        );
      })}
    </div>
  );

  // Inline edit textarea
  if (editing) {
    return (
      <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
        {!isOwn && <Avatar index={sender?.avatar ?? 0} name={sender?.name} size={28} photoUrl={sender?.photoUrl} />}
        <div className={`flex flex-col max-w-xs md:max-w-sm lg:max-w-md ${isOwn ? 'items-end' : 'items-start'}`}>
          <textarea
            autoFocus
            rows={2}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (editText.trim() && editText.trim() !== message.text) {
                  editMessage(message.chatId, message.id, editText.trim());
                }
                setEditing(false);
              }
              if (e.key === 'Escape') setEditing(false);
            }}
            className="resize-none bg-rose-50 border-2 border-rose-400 rounded-2xl px-4 py-2 text-base focus:outline-none leading-relaxed w-full"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => {
                if (editText.trim() && editText.trim() !== message.text) {
                  editMessage(message.chatId, message.id, editText.trim());
                }
                setEditing(false);
              }}
              className="text-xs bg-rose-600 text-white px-3 py-1 rounded-lg hover:bg-rose-700"
            >
              {t('saveEdit')}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-200"
            >
              {t('cancelEdit')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Call system message ───────────────────────────────────────────────────
  if (message.type === 'call') {
    let label = '📞 Call';
    try {
      const d = JSON.parse(message.text ?? '');
      const icon = d.ct === 'video' ? '📹' : '📞';
      if (d.k === 'ended') {
        const mins = Math.floor(d.d / 60).toString().padStart(2, '0');
        const secs = (d.d % 60).toString().padStart(2, '0');
        label = `${icon} ${t('callMsgEnded')} · ${mins}:${secs}`;
      } else if (d.k === 'missed') {
        label = `📵 ${t('callMsgMissed')}`;
      } else if (d.k === 'declined') {
        label = `📵 ${t('callMsgDeclined')}`;
      } else if (d.k === 'cancelled') {
        label = `🚫 ${t('callMsgCancelled')}`;
      }
    } catch { /* invalid JSON — use fallback */ }
    return (
      <div className="flex justify-center my-1">
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
          {label} · {formatMessageTime(message.createdAt)}
        </span>
      </div>
    );
  }

  if (isEmojiOnly) {
    return (
      <>
      <div
        ref={bubbleRef}
        className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
        style={{ WebkitTouchCallout: 'none' as React.CSSProperties['WebkitTouchCallout'], userSelect: 'none' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={e => e.preventDefault()}
      >
        {!isOwn && <Avatar index={sender?.avatar ?? 0} name={sender?.name} size={28} photoUrl={sender?.photoUrl} />}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {showSender && !isOwn && (
            <span className="text-xs text-gray-500 font-medium mb-1 ml-1">{sender?.name}</span>
          )}
          {message.replyTo && (
            <div className="bg-black/5 rounded-lg px-2 py-1 mb-1 border-l-2 border-rose-400 text-xs" data-testid="reply-quote">
              <span className="font-semibold text-rose-400 block truncate">
                {replyToSender?.name ?? message.replyTo.senderId}
              </span>
              <span className="line-clamp-2 break-words text-gray-500">
                {message.replyTo.type === 'image' ? t('photo')
                  : message.replyTo.type === 'emoji' ? (message.replyTo.emoji ?? '')
                  : (message.replyTo.text ?? '')}
              </span>
            </div>
          )}
          <div className="text-4xl leading-none select-none">{message.emoji}</div>
          {reactionsRow}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] text-gray-400">{formatMessageTime(message.createdAt)}</span>
            <MessageTicks message={message} isOwn={isOwn} />
          </div>
        </div>
        {actionStrip}
      </div>
      {contextPanel}
      </>
    );
  }

  return (
    <>
    <div
      ref={bubbleRef}
      className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
      style={{ WebkitTouchCallout: 'none' as React.CSSProperties['WebkitTouchCallout'], userSelect: 'none' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onContextMenu={e => e.preventDefault()}
    >
      {!isOwn && <Avatar index={sender?.avatar ?? 0} name={sender?.name} size={28} photoUrl={sender?.photoUrl} />}
      <div className={`flex flex-col max-w-xs md:max-w-sm lg:max-w-md ${isOwn ? 'items-end' : 'items-start'}`}>
        {showSender && !isOwn && (
          <span className="text-xs text-gray-500 font-medium mb-1 ml-1">{sender?.name}</span>
        )}
        {message.type === 'image' && imageSrc ? (
          <div className={`rounded-2xl overflow-hidden shadow-sm ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
            {replyQuote && <div className="px-2 pt-2 pb-0">{replyQuote}</div>}
            <img
              src={imageSrc}
              alt={t('sharedImage')}
              className="max-w-full block cursor-zoom-in"
              style={{ maxHeight: 220 }}
              onClick={() => setLightboxOpen(true)}
            />
          </div>
        ) : (
          <div
            className={`px-4 py-2.5 rounded-2xl text-base leading-relaxed ${
              isOwn
                ? 'glass-bubble-own text-white rounded-br-sm'
                : 'glass-bubble text-gray-800 rounded-bl-sm'
            }`}
          >
            {replyQuote}
            {message.text}
          </div>
        )}
        {reactionsRow}
        <div className={`flex items-center gap-1 mt-1 mx-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-gray-400">{formatMessageTime(message.createdAt)}</span>
          {message.edited && <span className="text-[10px] text-gray-400 italic">{t('edited')}</span>}
          <MessageTicks message={message} isOwn={isOwn} />
        </div>
      </div>
      {actionStrip}
    </div>
    {lightboxOpen && imageSrc && (
      <ImageLightbox
        url={imageSrc}
        onClose={() => setLightboxOpen(false)}
        onDownload={downloadImage}
      />
    )}
    {contextPanel}
  </>
  );
}

