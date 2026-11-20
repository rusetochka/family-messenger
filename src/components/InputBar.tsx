import { useRef, useState } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useStore } from '../store/useStore';
import { t, appLocale } from '../i18n';
import type { Message } from '../store/useStore';

interface Props {
  chatId: string;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

const MAX_UPLOAD_MB = 1;

export default function InputBar({ chatId, replyingTo, onCancelReply }: Props) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { sendMessage } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(chatId, 'text', { text: trimmed, replyToId: replyingTo?.id });
    setText('');
    setShowEmoji(false);
    onCancelReply?.();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleEmojiSelect(emoji: { native: string }) {
    const isAloneEmoji = !text.trim();
    if (isAloneEmoji) {
      sendMessage(chatId, 'emoji', { emoji: emoji.native, replyToId: replyingTo?.id });
      setShowEmoji(false);
      onCancelReply?.();
    } else {
      setText(prev => prev + emoji.native);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUploadError('Demo images must be at most 1 MB.');
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      await sendMessage(chatId, 'image', { file, replyToId: replyingTo?.id });
      onCancelReply?.();
    } catch {
      setUploadError(t('imageUploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative">
      {/* Reply preview strip */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border-t border-rose-200 text-sm" data-testid="reply-preview">
          <div className="flex-1 min-w-0 border-l-2 border-rose-400 pl-2">
            <span className="font-semibold text-rose-500 block text-xs">{t('replyingTo')}</span>
            <span className="text-gray-600 truncate block text-xs">
              {replyingTo.type === 'image' ? t('photo')
                : replyingTo.type === 'emoji' ? (replyingTo.emoji ?? '')
                : (replyingTo.text ?? '')}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="text-gray-400 hover:text-gray-600 leading-none text-lg flex-shrink-0"
            aria-label={t('cancelReply')}
          >&times;</button>
        </div>
      )}
      {/* Upload error banner */}
      {uploadError && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 bg-red-50 border-t border-red-200 text-red-600 text-sm">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600 leading-none text-lg">&times;</button>
        </div>
      )}

      {/* Emoji Picker popup */}
      {showEmoji && (
        <div className="absolute bottom-full left-0 mb-2 z-30">
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="light"
            previewPosition="none"
            skinTonePosition="none"
            locale={appLocale}
          />
        </div>
      )}

      <div className="flex items-end gap-2 px-5 py-3 glass-strong border-t border-white/30 safe-bottom safe-x">
        {/* Emoji toggle */}
        <button
          onClick={() => setShowEmoji(v => !v)}
          className={`w-11 h-11 text-xl flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
            showEmoji ? 'bg-yellow-100 text-yellow-600' : 'hover:bg-gray-100 text-gray-500'
          }`}
          title={t('emojiTitle')}
        >
          😊
        </button>

        {/* Image attach */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0 disabled:opacity-40"
          title={t('attachImageTitle')}
        >
          {uploading ? (
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />

        {/* Text input */}
        <textarea maxLength={2000}
          rows={1}
          placeholder={t('typeMessage')}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 resize-none bg-white/50 rounded-2xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-rose-400 max-h-28 overflow-y-auto leading-relaxed border border-white/30"
          style={{ minHeight: 40 }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-11 h-11 text-lg flex items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-200 text-white transition-colors flex-shrink-0"
          title={t('sendTitle')}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
