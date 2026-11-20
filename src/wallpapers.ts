import type { CSSProperties } from 'react';
import { t } from './i18n';

export interface Wallpaper {
  key: string;
  labelKey: 'wpNone' | 'wpKinCircle' | 'wpHearts' | 'wpChatBubbles' | 'wpStars' | 'wpFlowers' | 'wpHome' | 'wpNetwork' | 'wpWaves' | 'wpDiamonds' | 'wpConfetti';
  style: CSSProperties;
}

function enc(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const kinCircleSvg = enc(
  `<svg viewBox="0 0 60 60" width="60" height="60" xmlns="http://www.w3.org/2000/svg">` +
  `<circle cx="30" cy="30" r="21" fill="none" stroke="#e11d48" stroke-width="2" stroke-dasharray="5 2.5" opacity="0.12"/>` +
  `<circle cx="30" cy="8" r="4.5" fill="#e11d48" opacity="0.12"/>` +
  `<path d="M25.5 14 Q30 18 34.5 14" stroke="#e11d48" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.12"/>` +
  `<circle cx="52" cy="30" r="4.5" fill="#e11d48" opacity="0.12"/>` +
  `<path d="M46 25.5 Q42 30 46 34.5" stroke="#e11d48" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.12"/>` +
  `<circle cx="30" cy="52" r="4.5" fill="#e11d48" opacity="0.12"/>` +
  `<path d="M25.5 46 Q30 42 34.5 46" stroke="#e11d48" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.12"/>` +
  `<circle cx="8" cy="30" r="4.5" fill="#e11d48" opacity="0.12"/>` +
  `<path d="M14 25.5 Q18 30 14 34.5" stroke="#e11d48" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.12"/>` +
  `<path d="M30 26.5 C30 26.5 26.5 23 24 25 C21.5 27 25 31 30 34.5 C35 31 38.5 27 36 25 C33.5 23 30 26.5 30 26.5Z" fill="#e11d48" opacity="0.12"/>` +
  `</svg>`,
);

const heartsSvg = enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52">` +
  `<path d="M13 5C9 5 6 8 6 12c0 7 13 16 13 16s13-9 13-16c0-4-3-7-7-7-2 0-4 1-5 3-1-2-3-3-5-3Z" fill="#e11d48" opacity="0.12" transform="scale(0.55)"/>` +
  `<path d="M13 5C9 5 6 8 6 12c0 7 13 16 13 16s13-9 13-16c0-4-3-7-7-7-2 0-4 1-5 3-1-2-3-3-5-3Z" fill="#e11d48" opacity="0.08" transform="translate(28 27) scale(0.4)"/>` +
  `</svg>`,
);

const chatBubblesSvg = enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72">` +
  `<rect x="4" y="4" width="26" height="16" rx="5" fill="#e11d48" opacity="0.1"/>` +
  `<polygon points="8,20 5,27 17,20" fill="#e11d48" opacity="0.1"/>` +
  `<circle cx="10" cy="12" r="1.8" fill="white" opacity="0.55"/>` +
  `<circle cx="16" cy="12" r="1.8" fill="white" opacity="0.55"/>` +
  `<circle cx="22" cy="12" r="1.8" fill="white" opacity="0.55"/>` +
  `<rect x="40" y="34" width="28" height="18" rx="5" fill="#e11d48" opacity="0.07"/>` +
  `<polygon points="60,52 68,60 50,52" fill="#e11d48" opacity="0.07"/>` +
  `</svg>`,
);

const starsSvg = enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">` +
  `<polygon points="12,2 14.7,8.9 22,8.9 16.2,13.1 18.4,20 12,15.8 5.6,20 7.8,13.1 2,8.9 9.3,8.9" fill="#e11d48" opacity="0.13"/>` +
  `<polygon points="36,26 37.8,31.5 44,31.5 39,34.8 40.8,40 36,36.7 31.2,40 33,34.8 28,31.5 34.2,31.5" fill="#e11d48" opacity="0.09"/>` +
  `</svg>`,
);

const flowersSvg = enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52">` +
  `<ellipse cx="13" cy="8" rx="5" ry="6" fill="#e11d48" opacity="0.1"/>` +
  `<ellipse cx="13" cy="18" rx="5" ry="6" fill="#e11d48" opacity="0.1"/>` +
  `<ellipse cx="8" cy="13" rx="6" ry="5" fill="#e11d48" opacity="0.1"/>` +
  `<ellipse cx="18" cy="13" rx="6" ry="5" fill="#e11d48" opacity="0.1"/>` +
  `<circle cx="13" cy="13" r="3.5" fill="#e11d48" opacity="0.2"/>` +
  `<ellipse cx="39" cy="34" rx="4" ry="5" fill="#e11d48" opacity="0.07"/>` +
  `<ellipse cx="39" cy="44" rx="4" ry="5" fill="#e11d48" opacity="0.07"/>` +
  `<ellipse cx="34" cy="39" rx="5" ry="4" fill="#e11d48" opacity="0.07"/>` +
  `<ellipse cx="44" cy="39" rx="5" ry="4" fill="#e11d48" opacity="0.07"/>` +
  `<circle cx="39" cy="39" r="3" fill="#e11d48" opacity="0.14"/>` +
  `</svg>`,
);

const homeSvg = enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">` +
  `<polygon points="15,6 3,16 27,16" fill="#e11d48" opacity="0.11"/>` +
  `<rect x="4" y="15" width="22" height="15" rx="1.5" fill="#e11d48" opacity="0.11"/>` +
  `<rect x="10" y="21" width="6" height="9" rx="1" fill="white" opacity="0.45"/>` +
  `<polygon points="47,33 36,42 58,42" fill="#e11d48" opacity="0.07"/>` +
  `<rect x="37" y="41" width="20" height="13" rx="1.5" fill="#e11d48" opacity="0.07"/>` +
  `</svg>`,
);

const networkSvg = enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">` +
  `<circle cx="32" cy="32" r="3.5" fill="#e11d48" opacity="0.18"/>` +
  `<circle cx="0" cy="0" r="2.5" fill="#e11d48" opacity="0.1"/>` +
  `<circle cx="64" cy="0" r="2.5" fill="#e11d48" opacity="0.1"/>` +
  `<circle cx="0" cy="64" r="2.5" fill="#e11d48" opacity="0.1"/>` +
  `<circle cx="64" cy="64" r="2.5" fill="#e11d48" opacity="0.1"/>` +
  `<line x1="0" y1="0" x2="32" y2="32" stroke="#e11d48" stroke-width="0.8" opacity="0.09"/>` +
  `<line x1="64" y1="0" x2="32" y2="32" stroke="#e11d48" stroke-width="0.8" opacity="0.09"/>` +
  `<line x1="0" y1="64" x2="32" y2="32" stroke="#e11d48" stroke-width="0.8" opacity="0.09"/>` +
  `<line x1="64" y1="64" x2="32" y2="32" stroke="#e11d48" stroke-width="0.8" opacity="0.09"/>` +
  `</svg>`,
);

const wavesSvg = enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40">` +
  `<path d="M0 20Q10 8 20 20Q30 32 40 20Q50 8 60 20Q70 32 80 20" fill="none" stroke="#e11d48" stroke-width="1.8" opacity="0.12"/>` +
  `<path d="M0 38Q10 26 20 38Q30 50 40 38Q50 26 60 38Q70 50 80 38" fill="none" stroke="#e11d48" stroke-width="1.8" opacity="0.07"/>` +
  `</svg>`,
);

const diamondsSvg = enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36">` +
  `<polygon points="18,2 34,18 18,34 2,18" fill="none" stroke="#e11d48" stroke-width="0.9" opacity="0.12"/>` +
  `</svg>`,
);

const confettiSvg = enc(
  `<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54">` +
  `<circle cx="8" cy="8" r="2.8" fill="#e11d48" opacity="0.15"/>` +
  `<rect x="27" y="4" width="5" height="5" rx="1" fill="#e11d48" opacity="0.1" transform="rotate(30 29.5 6.5)"/>` +
  `<circle cx="46" cy="18" r="2" fill="#e11d48" opacity="0.12"/>` +
  `<rect x="5" y="31" width="6" height="6" rx="1" fill="#e11d48" opacity="0.1" transform="rotate(-20 8 34)"/>` +
  `<circle cx="26" cy="43" r="2.5" fill="#e11d48" opacity="0.13"/>` +
  `<rect x="39" y="37" width="4" height="7" rx="1" fill="#e11d48" opacity="0.1" transform="rotate(45 41 40.5)"/>` +
  `</svg>`,
);

export const WALLPAPERS: Wallpaper[] = [
  { key: 'none',        labelKey: 'wpNone',        style: { background: '#f9fafb' } },
  { key: 'kinCircle',   labelKey: 'wpKinCircle',   style: { backgroundColor: '#fdf2f4', backgroundImage: kinCircleSvg,   backgroundSize: '60px 60px' } },
  { key: 'hearts',      labelKey: 'wpHearts',      style: { backgroundColor: '#fff9f9', backgroundImage: heartsSvg,      backgroundSize: '52px 52px' } },
  { key: 'chatBubbles', labelKey: 'wpChatBubbles', style: { backgroundColor: '#f9fafb', backgroundImage: chatBubblesSvg, backgroundSize: '72px 72px' } },
  { key: 'stars',       labelKey: 'wpStars',       style: { backgroundColor: '#fff8fa', backgroundImage: starsSvg,       backgroundSize: '48px 48px' } },
  { key: 'flowers',     labelKey: 'wpFlowers',     style: { backgroundColor: '#fff5f7', backgroundImage: flowersSvg,     backgroundSize: '52px 52px' } },
  { key: 'home',        labelKey: 'wpHome',        style: { backgroundColor: '#f9fafb', backgroundImage: homeSvg,        backgroundSize: '60px 60px' } },
  { key: 'network',     labelKey: 'wpNetwork',     style: { backgroundColor: '#fdf9fa', backgroundImage: networkSvg,     backgroundSize: '64px 64px' } },
  { key: 'waves',       labelKey: 'wpWaves',       style: { backgroundColor: '#fff5f7', backgroundImage: wavesSvg,       backgroundSize: '80px 40px' } },
  { key: 'diamonds',    labelKey: 'wpDiamonds',    style: { backgroundColor: '#f9fafb', backgroundImage: diamondsSvg,    backgroundSize: '36px 36px' } },
  { key: 'confetti',    labelKey: 'wpConfetti',    style: { backgroundColor: '#fff8fa', backgroundImage: confettiSvg,    backgroundSize: '54px 54px' } },
];

export function getWallpaperStyle(key: string): CSSProperties {
  return WALLPAPERS.find(w => w.key === key)?.style ?? WALLPAPERS[1].style;
}

export function getWallpaperLabel(key: string): string {
  const w = WALLPAPERS.find(wp => wp.key === key);
  return w ? t(w.labelKey) : key;
}
