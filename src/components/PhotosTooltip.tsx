import { useState, useEffect } from 'react';
import { t } from '../i18n';

export const PHOTOS_HIGHLIGHT_KEY     = 'photos_highlight_seen';
export const LATEST_PHOTO_TS_KEY      = 'latest_photo_ts';
export const LAST_VISITED_PHOTOS_KEY  = 'last_visited_photos';

export function hasSeenPhotosHighlight(): boolean {
  return localStorage.getItem(PHOTOS_HIGHLIGHT_KEY) === '1';
}

export function markPhotosHighlightSeen(): void {
  localStorage.setItem(PHOTOS_HIGHLIGHT_KEY, '1');
  window.dispatchEvent(new Event('photos-highlight-dismissed'));
}

/** Returns true when a photo was added after the user last visited the gallery. */
export function hasNewPhotoBadge(): boolean {
  const latestTs    = localStorage.getItem(LATEST_PHOTO_TS_KEY) ?? '';
  const lastVisited = localStorage.getItem(LAST_VISITED_PHOTOS_KEY) ?? '';
  return latestTs > lastVisited;
}

/** Called when a photo:new socket event arrives; triggers re-evaluation in Sidebar. */
export function recordLatestPhotoTs(ts: string): void {
  localStorage.setItem(LATEST_PHOTO_TS_KEY, ts);
  window.dispatchEvent(new Event('photos-badge-updated'));
}

/** Called when the user opens the gallery; clears the badge. */
export function markPhotosVisited(): void {
  localStorage.setItem(LAST_VISITED_PHOTOS_KEY, new Date().toISOString());
  window.dispatchEvent(new Event('photos-visited'));
}

const PAD = 8;   // spotlight padding around target (px)
const GAP = 12;  // gap between spotlight edge and tooltip (px)
const TIP_W = 252; // fixed tooltip width (px)

interface TargetRect { top: number; left: number; width: number; height: number; }

function getRect(target: string): TargetRect | null {
  const el = document.querySelector(`[data-onboarding="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

interface Props { onDone: () => void; }

export default function PhotosTooltip({ onDone }: Props) {
  const [rect, setRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    const update = () => setRect(getRect('photos-btn'));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  function handleDismiss() {
    markPhotosHighlightSeen();
    onDone();
  }

  // Tooltip horizontal center clamped to viewport
  function clampLeft(centerX: number) {
    return Math.max(8, Math.min(centerX - TIP_W / 2, window.innerWidth - TIP_W - 8));
  }

  // ── Tooltip & arrow position ──────────────────────────────────────────────
  let tooltipStyle: React.CSSProperties;
  let arrowPos: { side: 'top' | 'bottom'; left: number } | null = null;

  if (!rect) {
    // Fallback: vertically centred (used in tests / when element not in DOM)
    tooltipStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TIP_W, zIndex: 52 };
  } else {
    const cx = rect.left + rect.width / 2;
    const tl = clampLeft(cx);
    const arrowLeft = Math.max(12, Math.min(cx - tl - 7, TIP_W - 26));
    // Button is in the bottom nav → tooltip appears above it
    tooltipStyle = { position: 'fixed', bottom: window.innerHeight - rect.top + PAD + GAP, left: tl, width: TIP_W, zIndex: 52 };
    arrowPos = { side: 'bottom', left: arrowLeft };
  }

  // ── Spotlight overlay around the target element ───────────────────────────
  const spotStyle: React.CSSProperties | undefined = rect ? {
    position: 'fixed',
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
    borderRadius: 10,
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
    border: '2px solid rgba(251,113,133,0.85)',
    zIndex: 51,
    pointerEvents: 'none',
    transition: 'top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease',
  } : undefined;

  return (
    <>
      {/* Click-blocker / dim background */}
      {rect
        ? <div className="fixed inset-0" style={{ zIndex: 50 }} aria-hidden />
        : <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" style={{ zIndex: 50 }} aria-hidden />
      }

      {/* Spotlight frame */}
      {spotStyle && <div style={spotStyle} aria-hidden />}

      {/* Tooltip card */}
      <div
        style={tooltipStyle}
        className="glass-card p-4 relative"
        role="dialog"
        aria-modal="true"
        aria-label={t('photosHighlightTitle')}
      >
        {/* Arrow pointing toward the highlighted button */}
        {arrowPos && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              [arrowPos.side]: -7,
              left: arrowPos.left,
              width: 0,
              height: 0,
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              ...(arrowPos.side === 'top'
                ? { borderBottom: '7px solid rgba(255,255,255,0.65)' }
                : { borderTop: '7px solid rgba(255,255,255,0.65)' }),
            }}
          />
        )}

        <div className="text-2xl mb-1.5">📸</div>
        <p className="font-bold text-gray-800 text-sm mb-1">{t('photosHighlightTitle')}</p>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{t('photosHighlightDesc')}</p>
        <button
          onClick={handleDismiss}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
        >
          {t('photosHighlightDismiss')}
        </button>
      </div>
    </>
  );
}
