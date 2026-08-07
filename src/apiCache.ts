const TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, fetchedAt: Date.now() }));
  } catch {
    // storage full or unavailable, ignore
  }
}

const inFlight = new Map<string, Promise<unknown>>();

export function fetchCached<T>(key: string, url: string): Promise<T> {
  const cached = readCache<T>(key);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = fetch(url)
    .then((r) => r.json())
    .then((json) => {
      writeCache(key, json);
      inFlight.delete(key);
      return json as T;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
}
