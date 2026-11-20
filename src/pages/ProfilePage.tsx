import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import AvatarPicker from '../components/AvatarPicker';
import WallpaperPicker from '../components/WallpaperPicker';
import { t } from '../i18n';
import { resolveMediaUrl } from '../assetUrl';

export default function ProfilePage() {
  const { currentUser, updateAvatar, updatePhoto, updateEmailNotifications, logout } = useStore();
  const navigate = useNavigate();
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar ?? 0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [name, setName] = useState(currentUser?.name ?? '');
  const [emailNotif, setEmailNotif] = useState(currentUser?.emailNotifications ?? true);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleAvatarSelect(idx: number) {
    setSelectedAvatar(idx);
    setSelectedFile(null);
    setPreviewUrl(null);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (selectedFile) {
      await updatePhoto(selectedFile);
    }
    await updateAvatar(selectedAvatar, trimmed || undefined);
    if (emailNotif !== (currentUser?.emailNotifications ?? true)) {
      await updateEmailNotifications(emailNotif);
    }
    navigate('/chat');
  }

  function handleBack() {
    navigate('/chat');
  }

  const displayPhoto =
    previewUrl ?? (resolveMediaUrl(currentUser.photoUrl) ?? currentUser.photoUrl) ?? null;

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10 safe-top">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title={t('back')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-800">{t('profile')}</h1>
          </div>
          <button
            onClick={logout}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={t('signOut')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Current user card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-3">
          <div
            className="relative cursor-pointer group"
            onClick={() => fileRef.current?.click()}
            title="Upload photo"
          >
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={currentUser.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <Avatar index={selectedAvatar} name={currentUser.name} size={80} />
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div className="text-center w-full">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={currentUser.name}
              maxLength={60}
              className="text-xl font-bold text-gray-800 text-center bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-rose-400 focus:outline-none w-full transition-colors"
              aria-label={t('fullName')}
            />
            <p className="text-sm text-gray-400 mt-1">{currentUser.email}</p>
            {currentUser.isAdmin && (
              <span className="mt-1 inline-block bg-rose-100 text-rose-600 text-xs font-semibold px-3 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* Avatar picker */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">{t('chooseAvatar')}</h2>
          <AvatarPicker selected={selectedAvatar} onSelect={handleAvatarSelect} name={currentUser.name} />
        </div>

        {/* Wallpaper picker */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">{t('chooseWallpaper')}</h2>
          <WallpaperPicker />
        </div>

        {/* Email notifications toggle */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-base font-semibold text-gray-700">{t('emailNotifications')}</p>
              <p className="text-sm text-gray-400 mt-0.5">Email delivery is disabled in this browser-only demo.</p>
            </div>
            <button
              type="button"
              role="switch" disabled title="Email delivery is disabled in this demo"
              aria-checked={emailNotif}
              onClick={() => setEmailNotif(v => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                emailNotif ? 'bg-rose-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                  emailNotif ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </label>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
        >
          {t('saveChanges')}
        </button>
      </main>
    </div>
  );
}
