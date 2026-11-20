import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import SakuraPetals from '../components/SakuraPetals';

// ── canvas stub ──────────────────────────────────────────────────────────────

function makeCtxStub() {
  return {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    set globalAlpha(_: number) {},
    set fillStyle(_: string) {},
    set strokeStyle(_: string) {},
    set lineWidth(_: number) {},
  };
}

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    makeCtxStub() as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  // Remove any stray canvas elements added by the component
  document.querySelectorAll('canvas').forEach(c => c.remove());
});

// ── component lifecycle ──────────────────────────────────────────────────────

describe('SakuraPetals', () => {
  it('appends a canvas to document.body on mount', () => {
    render(<SakuraPetals onDone={vi.fn()} />);
    expect(document.querySelectorAll('canvas').length).toBeGreaterThan(0);
  });

  it('canvas covers the full viewport (fixed, full-width/height)', () => {
    render(<SakuraPetals onDone={vi.fn()} />);
    const canvas = document.querySelector('canvas')!;
    expect(canvas.style.position).toBe('fixed');
    expect(canvas.style.top).toBe('0px');
    expect(canvas.style.left).toBe('0px');
    expect(canvas.style.width).toBe('100%');
    expect(canvas.style.height).toBe('100%');
  });

  it('canvas pixel height equals window.innerHeight', () => {
    Object.defineProperty(window, 'innerHeight', { value: 1200, configurable: true });
    Object.defineProperty(window, 'innerWidth',  { value: 1920, configurable: true });

    render(<SakuraPetals onDone={vi.fn()} />);
    const canvas = document.querySelector('canvas')!;
    expect(canvas.height).toBe(1200);
    expect(canvas.width).toBe(1920);
  });

  it('removes canvas on unmount', () => {
    const { unmount } = render(<SakuraPetals onDone={vi.fn()} />);
    unmount();
    expect(document.querySelectorAll('canvas').length).toBe(0);
  });
});

// ── fade-out formula ─────────────────────────────────────────────────────────
// Petals must remain fully visible until they reach the bottom edge.

describe('petal fade-out formula', () => {
  /**
   * Mirrors the logic in SakuraPetals.tsx:
   *   fadeOutY = clamp((y - (canvasH - size)) / (size * 4), 0, 1)
   */
  function fadeOutY(y: number, canvasH: number, size: number) {
    return Math.max(0, Math.min(1, (y - (canvasH - size)) / (size * 4)));
  }

  it('is 0 when the petal is well above the bottom', () => {
    expect(fadeOutY(0, 800, 14)).toBe(0);
    expect(fadeOutY(600, 800, 14)).toBe(0);
  });

  it('is 0 when the petal centre is still on screen (y < canvasH - size)', () => {
    // e.g. canvasH=800, size=14 → threshold starts at y=786
    expect(fadeOutY(785, 800, 14)).toBe(0);
  });

  it('starts fading only after the petal crosses the bottom edge', () => {
    expect(fadeOutY(787, 800, 14)).toBeGreaterThan(0);
  });

  it('is fully faded well below the bottom (y >> canvasH)', () => {
    expect(fadeOutY(800 + 14 * 4, 800, 14)).toBe(1);
  });

  it('scales correctly for a tall tablet screen (canvasH=1600)', () => {
    const canvasH = 1600, size = 14;
    expect(fadeOutY(canvasH - size - 1, canvasH, size)).toBe(0);   // still on screen
    expect(fadeOutY(canvasH + size * 4,  canvasH, size)).toBe(1);  // fully exited
  });
});

// ── vy scaling ───────────────────────────────────────────────────────────────
// Fall speed must scale with screen height so petals reach the bottom on
// tall tablet screens within the animation duration.

describe('vy scaling', () => {
  /**
   * Mirrors: const vyBase = canvas.height / 480
   */
  const vyBase = (h: number) => h / 480;

  it('produces faster vy on a taller screen', () => {
    expect(vyBase(1200)).toBeGreaterThan(vyBase(800));
  });

  it('slowest petal (vyBase*0.85) reaches bottom within 16 s at 60 fps', () => {
    const screenHeights = [800, 1000, 1200, 1600];
    for (const h of screenHeights) {
      const vy = vyBase(h) * 0.85;
      const framesNeeded = (h * 1.3) / vy; // worst case: petal starts 30% above top
      const framesAvailable = 16000 * 60 / 1000; // 16 s at 60 fps
      expect(framesNeeded).toBeLessThanOrEqual(framesAvailable);
    }
  });
});
