import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SakuraTooltip, {
  isSakuraSeason,
  hasSeenSakuraTooltip,
  markSakuraTooltipSeen,
  SAKURA_TOOLTIP_KEY,
} from '../components/SakuraTooltip';

vi.mock('../i18n', () => ({
  t: (key: string) => key,
}));

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

// ── isSakuraSeason ──────────────────────────────────────────────────────────

describe('isSakuraSeason', () => {
  function mockDate(month: number, day: number) {
    // month is 1-indexed here
    vi.setSystemTime(new Date(2026, month - 1, day));
  }

  it('is false before Mar 15', () => {
    vi.useFakeTimers();
    mockDate(3, 14);
    expect(isSakuraSeason()).toBe(false);
  });

  it('is true on Mar 15 (start)', () => {
    vi.useFakeTimers();
    mockDate(3, 15);
    expect(isSakuraSeason()).toBe(true);
  });

  it('is true in April', () => {
    vi.useFakeTimers();
    mockDate(4, 17);
    expect(isSakuraSeason()).toBe(true);
  });

  it('is true on May 15 (end)', () => {
    vi.useFakeTimers();
    mockDate(5, 15);
    expect(isSakuraSeason()).toBe(true);
  });

  it('is false after May 15', () => {
    vi.useFakeTimers();
    mockDate(5, 16);
    expect(isSakuraSeason()).toBe(false);
  });

  it('is false in December', () => {
    vi.useFakeTimers();
    mockDate(12, 1);
    expect(isSakuraSeason()).toBe(false);
  });
});

// ── localStorage helpers ────────────────────────────────────────────────────

describe('hasSeenSakuraTooltip / markSakuraTooltipSeen', () => {
  it('returns false when localStorage is empty', () => {
    expect(hasSeenSakuraTooltip()).toBe(false);
  });

  it('returns true after markSakuraTooltipSeen is called', () => {
    markSakuraTooltipSeen();
    expect(hasSeenSakuraTooltip()).toBe(true);
  });

  it('persists "1" in localStorage', () => {
    markSakuraTooltipSeen();
    expect(localStorage.getItem(SAKURA_TOOLTIP_KEY)).toBe('1');
  });

  it('dispatches sakura-tooltip-dismissed window event on mark', () => {
    const handler = vi.fn();
    window.addEventListener('sakura-tooltip-dismissed', handler);
    markSakuraTooltipSeen();
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('sakura-tooltip-dismissed', handler);
  });
});

// ── SakuraTooltip component ─────────────────────────────────────────────────

describe('SakuraTooltip', () => {
  it('renders the title key', () => {
    render(<SakuraTooltip onDone={vi.fn()} />);
    expect(screen.getAllByText('sakuraTitle').length).toBeGreaterThan(0);
  });

  it('renders the description', () => {
    render(<SakuraTooltip onDone={vi.fn()} />);
    expect(screen.getByText('sakuraTooltipDesc')).toBeInTheDocument();
  });

  it('renders the dismiss button', () => {
    render(<SakuraTooltip onDone={vi.fn()} />);
    expect(screen.getByText('sakuraTooltipDismiss')).toBeInTheDocument();
  });

  it('calls onDone and marks storage when dismiss button is clicked', () => {
    const onDone = vi.fn();
    render(<SakuraTooltip onDone={onDone} />);
    fireEvent.click(screen.getByText('sakuraTooltipDismiss'));
    expect(onDone).toHaveBeenCalledOnce();
    expect(hasSeenSakuraTooltip()).toBe(true);
  });

  it('also dismisses when clicking the backdrop', () => {
    const onDone = vi.fn();
    const { container } = render(<SakuraTooltip onDone={onDone} />);
    // The backdrop is the first fixed inset-0 div (aria-hidden)
    const backdrop = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('has role="dialog" with aria-label', () => {
    render(<SakuraTooltip onDone={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute('aria-label')).toBe('sakuraTitle');
  });

  it('renders an arrow when the target button is in the DOM', () => {
    const anchor = document.createElement('button');
    anchor.setAttribute('data-onboarding', 'sakura-btn');
    Object.defineProperty(anchor, 'getBoundingClientRect', {
      value: () => ({ top: 700, left: 300, width: 40, height: 40, bottom: 740, right: 340 }),
    });
    document.body.appendChild(anchor);

    const { container } = render(<SakuraTooltip onDone={vi.fn()} />);
    // Arrow is a div with inline borderLeft/borderRight/borderTop styles
    const arrow = container.querySelector('[aria-hidden="true"]:not([class*="inset"])') as HTMLElement | null;
    expect(arrow).not.toBeNull();

    document.body.removeChild(anchor);
  });
});
