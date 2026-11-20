/** Backend origin for Capacitor/Android (`vite build --mode android` + `.env.android`). */
const VITE_API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

/**
 * Resolves backend-relative paths (`/uploads/...`) for `<img src>` and fetches.
 * In the Capacitor WebView the document origin is not the API host, so relative
 * URLs must be prefixed with `VITE_API_URL`. Unchanged for absolute `http(s)`,
 * `data:`, and `blob:` URLs, and for same-origin production web builds.
 */
export function resolveMediaUrl(url: string | undefined | null): string | undefined {
  if (url == null || url.trim() === '') return undefined;
  const u = url.trim();
  if (/^(https?:|data:|blob:)/i.test(u)) return u;
  if (VITE_API && u.startsWith('/')) return `${VITE_API}${u}`;
  return u;
}

/** URL to pass to `fetch()` (always same-origin or explicit backend). */
export function mediaUrlForFetch(original: string): string {
  return resolveMediaUrl(original) ?? original;
}

/** Guards `fetch()` for downloads — allows same app origin, API host, dev backend, or root-relative. */
export function isTrustedMediaFetchUrl(resolvedUrl: string): boolean {
  if (/^javascript:/i.test(resolvedUrl)) return false;
  if (resolvedUrl.startsWith('data:') || resolvedUrl.startsWith('blob:')) return false;
  if (resolvedUrl.startsWith('/')) return true;
  if (VITE_API && resolvedUrl.startsWith(VITE_API)) return true;
  try {
    return new URL(resolvedUrl).origin === window.location.origin;
  } catch {
    return false;
  }
}
