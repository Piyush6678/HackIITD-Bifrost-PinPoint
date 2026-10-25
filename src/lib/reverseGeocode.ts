// Nearest named road for a point, from OpenStreetMap's Nominatim. Its usage policy allows light
// use: an identifying User-Agent, at most one request a second, and caching.

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const MIN_GAP_MS = 1100;
const CACHE_LIMIT = 500;

const cache = new Map<string, string | null>();
let lastCall = 0;

export async function nearestRoadName({ lat, lng }: { lat: number; lng: number }) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  const wait = lastCall + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCall = Date.now();

  let road: string | null = null;
  try {
    const params = new URLSearchParams({ format: "jsonv2", zoom: "17", addressdetails: "1", lat: String(lat), lon: String(lng) });
    const res = await fetch(`${ENDPOINT}?${params}`, {
      headers: { "User-Agent": "PinPoint-CivicIssueTracker/1.0", "Accept-Language": "en" },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) road = ((await res.json()) as { address?: { road?: string } }).address?.road ?? null;
  } catch {
    // Offline or slow: the road stays unknown and the issue keeps the generic department.
    return null;
  }

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, road);
  return road;
}
