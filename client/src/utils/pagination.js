export function getPageFromUrl(url, fallback) {
  if (!url) return fallback
  try {
    const u = new URL(url, window.location.origin)
    const p = Number(u.searchParams.get('page') || fallback)
    return Number.isFinite(p) ? p : fallback
  } catch {
    return fallback
  }
}