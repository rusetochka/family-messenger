import { useState } from 'react';
import { useStore } from '../store/useStore';
import Avatar from './Avatar';
import { t } from '../i18n';

interface Props {
  onClose: () => void;
}

export default function NewGroupModal({ onClose }: Props) {
  const { users, currentUser, createGroup } = useStore();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const eligible = users.filter(u => u.status === 'approved' && u.id !== currentUser?.id);

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || selected.length === 0) return;
    await createGroup(name.trim(), selected);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-sm">
        <div className="p-5 border-b border-white/30">
          <h2 className="text-lg font-bold text-gray-800">{t('newGroupChat')}</h2>
        </div>
        <form onSubmit={handleCreate} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('groupName')}</label>
            <input
              required
              placeholder={t('groupNamePlaceholder')}
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('addMembers')}</label>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {eligible.map(u => (
                <label
                  key={u.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selected.includes(u.id) ? 'bg-rose-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    onChange={() => toggle(u.id)}
                    className="accent-rose-600"
                  />
                  <Avatar index={u.avatar} name={u.name} size={32} photoUrl={u.photoUrl} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{u.name}</p>
                  </div>
                  {u.online && <span className="ml-auto w-2 h-2 rounded-full bg-green-400" />}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || selected.length === 0}
              className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-200 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
            >
              {t('createGroup')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
