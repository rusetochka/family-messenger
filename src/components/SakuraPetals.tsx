import { useEffect } from 'react';

interface Petal {
  x: number; y: number;
  vx: number; vy: number;
  rotation: number; rotSpeed: number;
  size: number;
  alpha: number;
  sway: number; swaySpeed: number; swayOffset: number;
  color: string;
  // Per-petal shape parameters
  widthRatio: number;  // half-width relative to size (0.55–0.78)
  notch: number;       // depth of heart notch at outer tip (0–0.55)
  tilt: number;        // left/right asymmetry (0.75–1.0)
  shoulderY: number;   // where petal is widest, as fraction of size (0.1–0.35)
}

interface Props { onDone: () => void; }

const COLORS = ['#FFB7C5', '#FF90A4', '#FFCDD8', '#FFF0F5', '#FFC0CB', '#FFE4E8', '#FADADD', '#FFD1DC'];

const rnd = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Draws a single sakura petal centred at (0,0).
 *
 * Anatomy (y axis: negative = up):
 *   - Base tip  →  (0, +baseY)   narrow attachment point, bottom
 *   - Outer tip →  (0, -s)       wide rounded edge with heart notch, top
 *
 * The petal widens from base up to a "shoulder" then keeps that width
 * until the rounded outer lobes, matching real cherry-blossom petals.
 */
function drawPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  const s = p.size;
  const hw = s * p.widthRatio;       // half-width at widest point
  const baseY   =  s * 0.88;         // narrow base tip (bottom)
  const tipY    = -s;                 // outer edge (top)
  const shoulderY = -s * p.shoulderY; // y where petal reaches full width
  const notchD  = s * 0.16 * p.notch; // notch depression (inward from tipY)
  const notchHW = hw * 0.28 * p.notch;// half-width of the notch gap
  const tl = p.tilt;                  // left-side scale factor

  ctx.beginPath();
  ctx.moveTo(0, baseY);

  // ── Right side: narrow base → wide shoulder → right outer lobe ──────────
  ctx.bezierCurveTo(
    hw * 0.28,  baseY * 0.45,   // spread out from base
    hw,          shoulderY,      // reach full width at shoulder
    hw * 0.72,  tipY + notchD + s * 0.12, // approach right lobe
  );
  // Right lobe outer curve (slight outward bulge)
  ctx.bezierCurveTo(
    hw * 0.95,  tipY - s * 0.04,
    hw * 0.4,   tipY - s * 0.08,
    notchHW,    tipY + notchD,
  );

  // ── Heart notch ──────────────────────────────────────────────────────────
  if (p.notch > 0.05) {
    ctx.quadraticCurveTo(0, tipY + notchD * 0.45, -notchHW, tipY + notchD);
  } else {
    // Nearly flat outer tip — just a gentle peak
    ctx.quadraticCurveTo(0, tipY - s * 0.04, -notchHW, tipY + notchD);
  }

  // ── Left side (mirrored + asymmetry via tl) ──────────────────────────────
  // Left lobe outer curve
  ctx.bezierCurveTo(
    -hw * 0.4  * tl, tipY - s * 0.08,
    -hw * 0.95 * tl, tipY - s * 0.04,
    -hw * 0.72 * tl, tipY + notchD + s * 0.12,
  );
  // Left lobe back down to base
  ctx.bezierCurveTo(
    -hw * tl,        shoulderY,
    -hw * 0.28 * tl, baseY * 0.45,
    0, baseY,
  );

  ctx.closePath();
}

export default function SakuraPetals({ onDone }: Props) {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    const COUNT = 110;
    // Scale fall speed so petals cross the full screen within the animation,
    // regardless of physical screen height (important for tablets).
    const vyBase = canvas.height / 480; // ~1.67 at 800px, ~2.5 at 1200px, etc.
    const petals: Petal[] = [];
    for (let i = 0; i < COUNT; i++) {
      petals.push({
        x: Math.random() * canvas.width,
        y: -Math.random() * canvas.height * 0.3,
        vx: rnd(-0.6, 1.0),
        vy: rnd(vyBase * 0.85, vyBase * 1.6),
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: rnd(-0.022, 0.022),
        size: rnd(9, 19),
        alpha: rnd(0.72, 0.96),
        sway: rnd(1.2, 3.2),
        swaySpeed: rnd(0.003, 0.01),
        swayOffset: Math.random() * Math.PI * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        widthRatio: rnd(0.55, 0.78),
        notch: rnd(0.05, 0.55),
        tilt: rnd(0.76, 1.0),
        shoulderY: rnd(0.10, 0.35),
      });
    }

    const DURATION = 16000;
    const startTime = performance.now();
    let frame: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let anyOnScreen = false;
      for (const p of petals) {
        const fadeIn  = progress < 0.05 ? progress / 0.05 : 1;
        // Per-petal fade: dissolve only after the petal exits the bottom edge
        const fadeOutY = Math.max(0, Math.min(1,
          (p.y - (canvas.height - p.size)) / (p.size * 4)
        ));
        // Global fade at the very end of the animation (last 8%)
        const globalFadeOut = progress > 0.92 ? 1 - (progress - 0.92) / 0.08 : 1;
        const a = p.alpha * fadeIn * (1 - fadeOutY) * globalFadeOut;

        const windX = Math.sin(elapsed * p.swaySpeed + p.swayOffset) * p.sway * 0.06
                    + Math.sin(elapsed * p.swaySpeed * 1.7 + p.swayOffset * 0.5) * p.sway * 0.025;
        p.x += p.vx + windX;
        p.y += p.vy + Math.sin(elapsed * p.swaySpeed * 2.3 + p.swayOffset) * 0.18;
        p.rotation += p.rotSpeed;

        if (p.y < canvas.height + 30) anyOnScreen = true;
        if (a <= 0.01) continue;

        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        // Filled petal
        ctx.fillStyle = p.color;
        drawPetal(ctx, p);
        ctx.fill();

        // Inner highlight — lighter centre strip for depth
        ctx.globalAlpha = a * 0.22;
        ctx.fillStyle = '#fff';
        ctx.save();
        ctx.scale(0.38, 0.55);
        ctx.translate(p.size * 0.08, 0);
        drawPetal(ctx, { ...p, notch: 0, tilt: 1 });
        ctx.fill();
        ctx.restore();

        // Central vein
        ctx.globalAlpha = a * 0.18;
        ctx.strokeStyle = 'rgba(180,60,90,1)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, p.size * 0.8);
        ctx.lineTo(0, -p.size * 0.72);
        ctx.stroke();

        ctx.restore();
      }

      if (elapsed < DURATION || anyOnScreen) {
        frame = requestAnimationFrame(animate);
      } else {
        if (document.body.contains(canvas)) document.body.removeChild(canvas);
        onDone();
      }
    };

    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      if (document.body.contains(canvas)) document.body.removeChild(canvas);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
