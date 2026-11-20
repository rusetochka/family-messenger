import { AVATAR_COLORS } from '../data/mockData';

function getInitials(name: string): string {
  const cleaned = name.replace(/\s*\([^)]*\)/g, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name[0]?.toLocaleUpperCase() ?? '?';
  if (parts.length === 1) return parts[0][0].toLocaleUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase();
}

interface Props {
  selected: number;
  onSelect: (index: number) => void;
  name?: string;
}

export default function AvatarPicker({ selected, onSelect, name }: Props) {
  const initials = name ? getInitials(name) : '?';
  return (
    <div className="grid grid-cols-5 gap-3">
      {AVATAR_COLORS.map((bg, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`rounded-full w-12 h-12 flex items-center justify-center font-bold text-white text-sm transition-all
            ${i === selected ? 'ring-4 ring-rose-500 ring-offset-2 scale-110' : 'hover:scale-105 hover:ring-2 hover:ring-rose-300 hover:ring-offset-1'}`}
          style={{ background: bg }}
          title={`Avatar ${i + 1}`}
        >
          {initials}
        </button>
      ))}
    </div>
  );
}
