import { useEffect } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string; size: number;
  rotation: number; rotSpeed: number;
  alpha: number;
  shape: 'rect' | 'circle';
}

interface Props { onDone: () => void; }

const COLORS = ['#e11d48','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#14b8a6'];

export default function ConfettiBurst({ onDone }: Props) {
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    const particles: Particle[] = [];
    for (let i = 0; i < 160; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height * 0.6 + Math.random() * canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 14,
        vy: -(Math.random() * 18 + 6),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 10 + 5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        alpha: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      });
    }

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.vy += 0.35;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.alpha = Math.max(0, p.alpha - 0.007);
        if (p.alpha > 0) alive = true;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive) {
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
