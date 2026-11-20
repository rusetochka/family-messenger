import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invitationsApi, ApiError } from '../api';
import { t } from '../i18n';

type State = 'loading' | 'ready' | 'invalid' | 'submitting' | 'success' | 'error';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<State>('loading');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    invitationsApi.validate(token)
      .then(() => setState('ready'))
      .catch(() => setState('invalid'));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setState('submitting');
    setErrorMsg('');
    try {
      await invitationsApi.accept(token, name, email, password);
      setState('success');
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.status === 409
            ? t('errEmailExists')
            : err.status === 404
              ? t('inviteInvalid')
              : err.message)
        : t('inviteError');
      setErrorMsg(msg);
      setState('error');
    }
  }

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="text-rose-600 text-lg font-semibold animate-pulse">KinCircle…</div>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">🔗</div>
          <h1 className="text-xl font-bold text-gray-800">{t('inviteInvalid')}</h1>
          <p className="text-sm text-gray-500">{t('inviteInvalidDesc')}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {t('backToSignIn')}
          </button>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">🎉</div>
          <h1 className="text-xl font-bold text-gray-800">{t('inviteSuccess')}</h1>
          <p className="text-sm text-gray-500">{t('inviteSuccessDesc')}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {t('signInBtn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <div className="text-3xl">🏡</div>
          <h1 className="text-xl font-bold text-gray-800">{t('inviteTitle')}</h1>
          <p className="text-sm text-gray-500">{t('inviteSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              minLength={8}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
            <ul className="mt-1.5 space-y-0.5 text-xs text-gray-400">
              <li>• {t('passwordRuleLength')}</li>
              <li>• {t('passwordRuleUppercase')}</li>
              <li>• {t('passwordRuleDigit')}</li>
              <li>• {t('passwordRuleSpecial')}</li>
            </ul>
          </div>

          {state === 'error' && errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={state === 'submitting'}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {state === 'submitting' ? '…' : t('inviteJoinBtn')}
          </button>
        </form>
      </div>
    </div>
  );
}
