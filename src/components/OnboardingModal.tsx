import { useState, useEffect } from 'react';
import { t } from '../i18n';

export const ONBOARDING_KEY = 'onboarding_done';

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export function markOnboardingDone(): void {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

type Placement = 'below' | 'above';

interface Step {
  target: string;
  placement: Placement;
  icon: string;
  titleKey: Parameters<typeof t>[0];
  descKey: Parameters<typeof t>[0];
}

const STEPS: Step[] = [
  { target: 'new-dm',      placement: 'below', icon: '💬', titleKey: 'onboardingStep1Title', descKey: 'onboardingStep1Desc' },
  { target: 'new-group',   placement: 'below', icon: '👥', titleKey: 'onboardingStep2Title', descKey: 'onboardingStep2Desc' },
  { target: 'search',      placement: 'below', icon: '🔍', titleKey: 'onboardingStep3Title', descKey: 'onboardingStep3Desc' },
  { target: 'profile-btn', placement: 'above', icon: '👤', titleKey: 'onboardingStep4Title', descKey: 'onboardingStep4Desc' },
];

const PAD = 8;    // spotlight padding around target (px)
const GAP = 12;   // gap between spotlight edge and tooltip (px)
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

export default function OnboardingModal({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  useEffect(() => {
    const update = () => setRect(getRect(current.target));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [step]);

  function handleNext() {
    if (isLast) { markOnboardingDone(); onDone(); }
    else setStep(s => s + 1);
  }

  function handleSkip() { markOnboardingDone(); onDone(); }

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
    if (current.placement === 'below') {
      tooltipStyle = { position: 'fixed', top: rect.top + rect.height + PAD + GAP, left: tl, width: TIP_W, zIndex: 52 };
      arrowPos = { side: 'top', left: arrowLeft };
    } else {
      tooltipStyle = { position: 'fixed', bottom: window.innerHeight - rect.top + PAD + GAP, left: tl, width: TIP_W, zIndex: 52 };
      arrowPos = { side: 'bottom', left: arrowLeft };
    }
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
        aria-label={t('onboardingTitle')}
      >
        {/* Arrow pointing toward the highlighted element */}
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
                : { borderTop:    '7px solid rgba(255,255,255,0.65)' }),
            }}
          />
        )}

        {/* Step counter + skip */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-rose-500">{step + 1} / {STEPS.length}</span>
          <button
            onClick={handleSkip}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={t('onboardingSkip')}
          >
            {t('onboardingSkip')}
          </button>
        </div>

        <div className="text-2xl mb-1.5">{current.icon}</div>
        <p className="font-bold text-gray-800 text-sm mb-1">{t(current.titleKey)}</p>
        <p className="text-xs text-gray-500 leading-relaxed mb-3">{t(current.descKey)}</p>

        {/* Dot indicators */}
        <div className="flex gap-1.5 mb-3">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-300 ${i === step ? 'w-5 h-2 bg-rose-500' : 'w-2 h-2 bg-gray-300'}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="w-full bg-rose-500 hover:bg-rose-600 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
        >
          {isLast ? t('onboardingDone') : t('onboardingNext')}
        </button>
      </div>
    </>
  );
}
