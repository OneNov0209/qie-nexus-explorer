/**
 * Lightweight client-side TTL cache + in-flight deduplication + concurrency
 * limiter for RPC/REST requests. Keeps the dashboard snappy and avoids
 * hammering upstream endpoints (important on Vercel where many tabs may hit
 * the same edge region simultaneously).
 */

type Entry = { value: any; expires: number };

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<any>>();

const MAX_ENTRIES = 500;

function setCache(key: string, value: any, ttl: number) {
  if (store.size >= MAX_ENTRIES) {
    // simple FIFO eviction
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
  store.set(key, { value, expires: Date.now() + ttl });
}

function getCache(key: string): any | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.value;
}

// ---- Concurrency limiter (token bucket-ish) ----
const MAX_CONCURRENT = 6;
let active = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(() => { active++; resolve(); }));
}

function release() {
  active--;
  const next = queue.shift();
  if (next) next();
}

// ---- Rate limit (simple per-second cap) ----
const RATE_PER_SEC = 25;
let bucket = RATE_PER_SEC;
setInterval(() => { bucket = RATE_PER_SEC; }, 1000);

async function rateGate() {
  while (bucket <= 0) {
    await new Promise((r) => setTimeout(r, 50));
  }
  bucket--;
}

/**
 * Wrap a fetcher with TTL cache + dedupe + concurrency + rate limit.
 * Failures are NOT cached so retries can recover.
 */
export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = getCache(key);
  if (hit !== undefined) return hit as T;

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    await acquire();
    try {
      await rateGate();
      const value = await fetcher();
      setCache(key, value, ttlMs);
      return value;
    } finally {
      release();
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/** Decide TTL based on endpoint characteristics. */
export function ttlFor(path: string): number {
  // hot, frequently-changing data
  if (/status|net_info|blockNumber|consensus|block(?!s)|getBlockBy/.test(path)) return 3_000;
  if (/txs|getTransaction|getReceipt/.test(path)) return 10_000;
  // moderately stable
  if (/validators|pool|inflation|annual_provisions|signing_infos|rewards|delegations|balance/.test(path)) return 15_000;
  // very stable
  if (/params|proposals|channels|connections|client_states|wasm/.test(path)) return 30_000;
  return 8_000;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) { store.clear(); return; }
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
