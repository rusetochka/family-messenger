import { useState, useEffect } from 'react';
import { t } from '../i18n';

export const SAKURA_TOOLTIP_KEY = 'sakura_tooltip_2026_seen';

/** Returns true if the current date falls within sakura season (Mar 15 – May 15). */
export function isSakuraSeason(): boolean {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const day = now.getDate();
  return (month === 3 && day >= 15) || month === 4 || (month === 5 && day <= 15);
}

export function hasSeenSakuraTooltip(): boolean {
  return localStorage.getItem(SAKURA_TOOLTIP_KEY) === '1';
}

export function markSakuraTooltipSeen(): void {
  localStorage.setItem(SAKURA_TOOLTIP_KEY, '1');
  window.dispatchEvent(new Event('sakura-tooltip-dismissed'));
}

const GAP = 12;
const TIP_W = 240;
const PAD = 6;

interface TargetRect { top: number; left: number; width: number; height: number; }

function getRect(target: string): TargetRect | null {
  const el = document.querySelector(`[data-onboarding="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

interface Props { onDone: () => void; }

export default function SakuraTooltip({ onDone }: Props) {
  const [rect, setRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    const update = () => setRect(getRect('sakura-btn'));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  function handleDismiss() {
    markSakuraTooltipSeen();
    onDone();
  }

  function clampLeft(centerX: number) {
    return Math.max(8, Math.min(centerX - TIP_W / 2, window.innerWidth - TIP_W - 8));
  }

  let tooltipStyle: React.CSSProperties;
  let arrowPos: { side: 'top' | 'bottom'; left: number } | null = null;

  if (!rect) {
    tooltipStyle = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: TIP_W, zIndex: 52 };
  } else {
    const cx = rect.left + rect.width / 2;
    const tl = clampLeft(cx);
    const arrowLeft = Math.max(12, Math.min(cx - tl - 7, TIP_W - 26));
    tooltipStyle = { position: 'fixed', bottom: window.innerHeight - rect.top + PAD + GAP, left: tl, width: TIP_W, zIndex: 52 };
    arrowPos = { side: 'bottom', left: arrowLeft };
  }

  return (
    <>
      {/* Dismissable backdrop (no heavy dim — keep it light/cheerful) */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 50 }}
        onClick={handleDismiss}
        aria-hidden
      />

      {/* Tooltip card */}
      <div
        style={tooltipStyle}
        className="glass-card p-4 relative"
        role="dialog"
        aria-modal="true"
        aria-label={t('sakuraTitle')}
      >
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

        <div className="text-2xl mb-1.5">🌸</div>
        <p className="font-bold text-gray-800 text-sm mb-1">{t('sakuraTitle')}</p>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{t('sakuraTooltipDesc')}</p>
        <button
          onClick={handleDismiss}
          className="w-full bg-rose-400 hover:bg-rose-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
        >
          {t('sakuraTooltipDismiss')}
        </button>
      </div>
    </>
  );
}
