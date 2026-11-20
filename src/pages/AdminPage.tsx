import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar';
import { t, localeTag } from '../i18n';
import { invitationsApi, ApiError } from '../api';

export default function AdminPage() {
  const { users, currentUser, approveUser, rejectUser, loadPendingUsers, loadUsers, loadRejectedUsers } = useStore();
  const navigate = useNavigate();

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteGenerating, setInviteGenerating] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    // Sequential: loadUsers() replaces the entire users array; calling loadPendingUsers()
    // afterwards merges the pending users in, so the order matters.
    loadUsers().then(() => Promise.all([loadPendingUsers(), loadRejectedUsers()]));
  }, []);

  async function generateInvite() {
    setInviteGenerating(true);
    setInviteError('');
    setInviteLink(null);
    try {
      const inv = await invitationsApi.create();
      const link = `${window.location.origin}/invite/${inv.token}`;
      setInviteLink(link);
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : t('inviteError'));
    } finally {
      setInviteGenerating(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  const pending = users.filter(u => u.status === 'pending');
  const approved = users.filter(u => u.status === 'approved');
  const rejected = users.filter(u => u.status === 'rejected');

  return (
    <div className="h-dvh overflow-y-auto bg-gray-50">
      {/* Top bar */}
      <header className="bg-white shadow-sm sticky top-0 z-10 safe-top">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title={t('back')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-800">{t('adminTitle')}</h1>
          </div>
          {currentUser && (
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 rounded-full hover:bg-gray-100 px-2 py-1 transition-colors"
            >
              <Avatar index={currentUser.avatar} name={currentUser.name} size={32} photoUrl={currentUser.photoUrl} />
              <span className="text-sm text-gray-600">{currentUser.name}</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Invite link */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">{t('inviteSection')}</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <p className="text-sm text-gray-500">Invitations are disabled in this public demo. Sample member approvals below are fully interactive.</p>
            <button
              onClick={generateInvite}
              disabled={true} title="Invitations are disabled in the public demo"
              className="bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {inviteGenerating ? '…' : t('generateInviteLink')}
            </button>
            {inviteError && (
              <p className="text-sm text-red-600">{inviteError}</p>
            )}
            {inviteLink && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-700 break-all flex-1 font-mono">{inviteLink}</span>
                <button
                  onClick={copyInviteLink}
                  className="text-xs bg-rose-100 text-rose-700 font-semibold px-3 py-1 rounded-lg hover:bg-rose-200 transition-colors whitespace-nowrap"
                >
                  {inviteCopied ? t('inviteCopied') : t('inviteCopy')}
                </button>
              </div>
            )}
            {inviteLink && (
              <p className="text-xs text-gray-400">{t('inviteLinkExpiry')}</p>
            )}
          </div>
        </section>

        {/* Pending */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold">{pending.length}</span>
            {t('awaitingApproval')}
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-400 italic">{t('noPendingUsers')}</p>
          ) : (
            <div className="space-y-3">
              {pending.map(user => (
                <div key={user.id} className="bg-white rounded-xl shadow-sm border border-yellow-100 p-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar index={user.avatar} name={user.name} size={44} photoUrl={user.photoUrl} />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => approveUser(user.id)}
                      className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                    >
                      {t('approve')}
                    </button>
                    <button
                      onClick={() => rejectUser(user.id)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                    >
                      {t('reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Approved members */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-bold">{approved.length}</span>
            {t('approvedMembers')}
          </h2>
          <div className="space-y-2">
            {approved.map(user => (
              <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3">
                <Avatar index={user.avatar} name={user.name} size={36} photoUrl={user.photoUrl} />
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    {user.name}
                    {user.id === currentUser?.id && (
                      <span className="ml-2 text-xs text-rose-400 font-normal">({t('you')})</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                {user.id !== currentUser?.id && !user.isAdmin && (
                  <button
                    onClick={() => rejectUser(user.id)}
                    className="ml-auto text-xs bg-red-50 text-red-500 font-semibold px-3 py-1 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    {t('removeAccess')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Rejected */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full font-bold">{rejected.length}</span>
            {t('rejectedSection')}
          </h2>
          {rejected.length === 0 ? (
            <p className="text-sm text-gray-400 italic">{t('noRejectedUsers')}</p>
          ) : (
            <div className="space-y-2">
              {rejected.map(user => (
                <div key={user.id} className="bg-white rounded-xl shadow-sm border border-red-50 p-3 flex flex-wrap items-center gap-3">
                  <Avatar index={user.avatar} name={user.name} size={36} photoUrl={user.photoUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-400 text-sm line-through truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    {user.lastStatusChange && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t('rejectedBy')}{' '}
                        <span className="font-medium text-gray-500">
                          {user.lastStatusChange.changedByName ?? t('unknownAdmin')}
                        </span>
                        {' · '}
                        {new Date(user.lastStatusChange.changedAt).toLocaleDateString(localeTag)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => approveUser(user.id)}
                    className="flex-shrink-0 text-xs bg-green-50 text-green-700 font-semibold px-3 py-1 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    {t('restoreUser')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
