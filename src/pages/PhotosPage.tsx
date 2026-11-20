import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import type { Chat } from '../store/useStore';
import { photosApi, ApiPhoto, uploadFile } from '../api';
import { resolveMediaUrl, mediaUrlForFetch, isTrustedMediaFetchUrl } from '../assetUrl';
import { t, formatYearsAgo } from '../i18n';
import { markPhotosVisited } from '../components/PhotosTooltip';

export default function PhotosPage() {
  const { currentUser, chats, users, setActiveChat, sendMessage } = useStore();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState<ApiPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  // Add photo form (all users)
  const [showAddForm, setShowAddForm] = useState(false);
  const [yearsAgo, setYearsAgo] = useState(5);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Lightbox
  const [lightbox, setLightbox] = useState<ApiPhoto | null>(null);

  // Discuss in chat
  const [discussPhoto, setDiscussPhoto] = useState<ApiPhoto | null>(null);
  const [discussing, setDiscussing] = useState(false);

  useEffect(() => {
    markPhotosVisited();
    photosApi.list()
      .then(setPhotos)
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!newFile) return;
    setAdding(true);
    setAddError('');
    try {
      const photoUrl = await uploadFile(newFile);
      const title = formatYearsAgo(yearsAgo);
      const created = await photosApi.add(title, photoUrl);
      setPhotos(prev => [created, ...prev]);
      setYearsAgo(5);
      setNewFile(null);
      setShowAddForm(false);
    } catch {
      setAddError(t('photosAddError'));
    } finally {
      setAdding(false);
    }
  }

  async function downloadImage(url: string) {
    const resolved = mediaUrlForFetch(url);
    if (!isTrustedMediaFetchUrl(resolved)) return;
    try {
      const res = await fetch(resolved);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = resolved.split('/').pop()?.replace(/[^a-zA-Z0-9._-]/g, '') || 'photo';
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch { /* silent */ }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('photosDeleteConfirm'))) return;
    await photosApi.remove(id);
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (lightbox?.id === id) setLightbox(null);
  }

  async function handleDiscuss(chat: Chat) {
    if (!discussPhoto || discussing) return;
    setDiscussing(true);
    try {
      await sendMessage(chat.id, 'image', { imageUrl: discussPhoto.photo_url });
      setActiveChat(chat);
      setDiscussPhoto(null);
      navigate('/chat');
    } finally {
      setDiscussing(false);
    }
  }

  const myChats = (chats ?? []).filter(c => c.memberIds.includes(currentUser?.id ?? ''));

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50">
      {/* Top bar */}
      <header className="bg-white shadow-sm sticky top-0 z-10 safe-top">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/chat')}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={t('back')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-800">{t('photosOfDay')}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Add new memory — available to all users, collapsed by default */}
        <section>
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-rose-200 text-rose-500 hover:border-rose-400 hover:bg-rose-50/50 transition-colors text-sm font-semibold"
              data-testid="add-memory-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              {t('photosAddMemory')}
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3" data-testid="add-memory-form">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-semibold text-gray-700">{t('photosAddSection')}</h2>
                <button
                  onClick={() => { setShowAddForm(false); setAddError(''); setNewFile(null); }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
                  aria-label={t('cancel')}
                >
                  ×
                </button>
              </div>
              {/* Year selector */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-600 whitespace-nowrap" htmlFor="years-ago-input">
                  {t('photosYearsAgo')}
                </label>
                <input
                  id="years-ago-input"
                  type="number"
                  min={1}
                  max={100}
                  value={yearsAgo}
                  onChange={e => setYearsAgo(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                  className="w-20 text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 text-center"
                />
              </div>
              <p className="text-xs text-rose-500 font-medium">→ &ldquo;{formatYearsAgo(yearsAgo)}&rdquo;</p>
              <label className="block">
                <span className="sr-only">{t('photosYearsAgo')}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setNewFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-500
                    file:mr-3 file:py-1.5 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-rose-50 file:text-rose-700
                    hover:file:bg-rose-100"
                />
              </label>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
              <button
                onClick={handleAdd}
                disabled={adding || !newFile}
                className="bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                {adding ? t('photosAdding') : t('photosUploadBtn')}
              </button>
            </div>
          )}
        </section>

        {/* Gallery */}
        <section>
          {loading ? (
            <div className="flex justify-center py-16">
              <svg className="w-8 h-8 animate-spin text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          ) : photos.length === 0 ? (
            <p className="text-sm text-gray-400 italic text-center py-16">{t('photosEmpty')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group"
                >
                  <button
                    className="w-full relative block"
                    onClick={() => setLightbox(photo)}
                    aria-label={photo.title}
                  >
                    <img
                      src={resolveMediaUrl(photo.photo_url) ?? photo.photo_url}
                      alt={photo.title}
                      className="w-full h-52 object-cover group-hover:brightness-95 transition-[filter]"
                    />
                  </button>
                  <div className="px-4 py-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{photo.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(photo.created_at).toLocaleDateString(undefined, {
                          year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => setDiscussPhoto(photo)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                        title={t('discussInChat')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => downloadImage(photo.photo_url)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        title={t('downloadImage')}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                      {currentUser?.isAdmin && (
                        <button
                          onClick={() => handleDelete(photo.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title={t('deleteMessage')}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={resolveMediaUrl(lightbox.photo_url) ?? lightbox.photo_url}
            alt={lightbox.title}
            className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <p className="mt-4 text-white font-semibold text-base text-center">{lightbox.title}</p>
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={e => { e.stopPropagation(); downloadImage(lightbox.photo_url); }}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {t('downloadImage')}
            </button>
            <button
              onClick={e => { e.stopPropagation(); setLightbox(null); setDiscussPhoto(lightbox); }}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              title={t('discussInChat')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {t('discussInChat')}
            </button>
            <button
              onClick={() => setLightbox(null)}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              ✕ {t('cancelEdit')}
            </button>
          </div>
        </div>
      )}

      {/* Discuss-in-chat modal */}
      {discussPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center"
          onClick={() => setDiscussPhoto(null)}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-base">{t('shareToChat')}</p>
              <button
                onClick={() => setDiscussPhoto(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {myChats.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-8">{t('noChatsFound')}</p>
              ) : (
                myChats.map(chat => {
                  const otherId = chat.isGroup ? null : chat.memberIds.find(id => id !== currentUser?.id);
                  const name = chat.isGroup
                    ? (chat.name ?? 'Group')
                    : ((users ?? []).find(u => u.id === otherId)?.name ?? 'Unknown');
                  return (
                    <button
                      key={chat.id}
                      onClick={() => handleDiscuss(chat)}
                      disabled={discussing}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-600 font-bold text-sm">{name[0]?.toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100">
              <button
                onClick={() => setDiscussPhoto(null)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
