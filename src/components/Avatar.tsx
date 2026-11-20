import { AVATAR_COLORS } from '../data/mockData';
import { resolveMediaUrl } from '../assetUrl';

function getInitials(name: string): string {
  // Strip parenthetical suffixes like "(You)", "(pending)"
  const cleaned = name.replace(/\s*\([^)]*\)/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name[0]?.toLocaleUpperCase() ?? '?';
  if (parts.length === 1) return parts[0][0].toLocaleUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase();
}

interface Props {
  index: number;
  name?: string;
  size?: number;
  className?: string;
  photoUrl?: string;
}

export default function Avatar({ index, name, size = 40, className = '', photoUrl }: Props) {
  if (photoUrl) {
    const src = resolveMediaUrl(photoUrl) ?? photoUrl;
    return (
      <img
        src={src}
        alt={name ?? ''}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = name ? getInitials(name) : String(index + 1);
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}
