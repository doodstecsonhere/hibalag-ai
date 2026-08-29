export const AI_QUOTAS = {
  authenticated: { minute: 5, day: 20 },
  guest: { minute: 3, day: 10 },
  globalDay: 20,
} as const;

type SqlResult<T> = Iterable<T>;

type DurableObjectSql = {
  exec<T = Record<string, unknown>>(query: string, ...bindings: unknown[]): SqlResult<T>;
};

type DurableObjectStorage = {
  sql: DurableObjectSql;
  transactionSync<T>(callback: () => T): T;
};

type DurableObjectState = { storage: DurableObjectStorage };

type QuotaRequest = {
  identityKey: string;
  tier: "authenticated" | "guest";
  now: number;
};

type Counter = { count: number };

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function parseRequest(value: unknown): QuotaRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (body.tier !== "authenticated" && body.tier !== "guest") return null;
  if (typeof body.identityKey !== "string" || !/^[a-f0-9]{64}$/.test(body.identityKey)) return null;
  if (typeof body.now !== "number" || !Number.isFinite(body.now) || body.now < 0) return null;
  return body as QuotaRequest;
}

function firstCount(sql: DurableObjectSql, key: string) {
  const row = Array.from(sql.exec<Counter>("SELECT count FROM counters WHERE key = ?", key))[0];
  return row?.count ?? 0;
}

function secondsUntil(timestamp: number, windowMs: number) {
  return Math.max(
    1,
    Math.ceil((Math.floor(timestamp / windowMs) * windowMs + windowMs - timestamp) / 1000),
  );
}

export class HibalagAiQuota {
  private readonly storage: DurableObjectStorage;

  constructor(state: DurableObjectState) {
    this.storage = state.storage;
    this.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)",
    );
  }

  async fetch(request: Request) {
    if (request.method !== "POST") return json({ allowed: false }, 405);
    const body = parseRequest(await request.json().catch(() => null));
    if (!body) return json({ allowed: false }, 400);

    const minute = Math.floor(body.now / 60_000);
    const day = Math.floor(body.now / 86_400_000);
    const limits = AI_QUOTAS[body.tier];
    const keys = {
      minute: `${body.tier}:minute:${body.identityKey}:${minute}`,
      day: `${body.tier}:day:${body.identityKey}:${day}`,
      global: `global:day:${day}`,
    };

    return this.storage.transactionSync(() => {
      this.storage.sql.exec("DELETE FROM counters WHERE expires_at <= ?", body.now);
      const counts = {
        minute: firstCount(this.storage.sql, keys.minute),
        day: firstCount(this.storage.sql, keys.day),
        global: firstCount(this.storage.sql, keys.global),
      };
      if (counts.minute >= limits.minute) {
        return json({ allowed: false, retryAfterSeconds: secondsUntil(body.now, 60_000) });
      }
      if (counts.day >= limits.day || counts.global >= AI_QUOTAS.globalDay) {
        return json({ allowed: false, retryAfterSeconds: secondsUntil(body.now, 86_400_000) });
      }

      const upsert =
        "INSERT INTO counters (key, count, expires_at) VALUES (?, 1, ?) " +
        "ON CONFLICT(key) DO UPDATE SET count = count + 1, expires_at = excluded.expires_at";
      this.storage.sql.exec(upsert, keys.minute, (minute + 1) * 60_000);
      this.storage.sql.exec(upsert, keys.day, (day + 1) * 86_400_000);
      this.storage.sql.exec(upsert, keys.global, (day + 1) * 86_400_000);
      return json({ allowed: true });
    });
  }
}
