import { WALLPAPERS, getWallpaperLabel } from '../wallpapers';
import { useStore } from '../store/useStore';

export default function WallpaperPicker() {
  const { wallpaper, setWallpaper } = useStore();

  return (
    <div className="flex flex-wrap gap-3">
      {WALLPAPERS.map(w => (
        <button
          key={w.key}
          onClick={() => setWallpaper(w.key)}
          title={getWallpaperLabel(w.key)}
          className={`w-16 h-12 rounded-xl border-2 transition-all flex-shrink-0 ${
            wallpaper === w.key
              ? 'border-rose-500 ring-2 ring-rose-200 scale-105'
              : 'border-gray-200 hover:border-rose-300'
          }`}
          style={w.style}
        >
          {wallpaper === w.key && (
            <span className="text-rose-600 text-sm font-bold drop-shadow-sm">✓</span>
          )}
        </button>
      ))}
    </div>
  );
}
