import assert from "node:assert/strict";
import test from "node:test";

import { AI_QUOTAS, HibalagAiQuota } from "./ai-quota-do.ts";

function createState() {
  const counters = new Map<string, { count: number; expires_at: number }>();
  const sql = {
    exec<T>(query: string, ...bindings: unknown[]): Iterable<T> {
      if (query.startsWith("CREATE TABLE")) return [];
      if (query.startsWith("DELETE FROM")) {
        const now = bindings[0] as number;
        for (const [key, value] of counters) if (value.expires_at <= now) counters.delete(key);
        return [];
      }
      if (query.startsWith("SELECT count")) {
        const value = counters.get(bindings[0] as string);
        return (value ? [{ count: value.count }] : []) as T[];
      }
      if (query.startsWith("INSERT INTO")) {
        const key = bindings[0] as string;
        const expires_at = bindings[1] as number;
        counters.set(key, { count: (counters.get(key)?.count ?? 0) + 1, expires_at });
        return [];
      }
      throw new Error(`Unexpected fictional SQL: ${query}`);
    },
  };
  return {
    state: { storage: { sql, transactionSync: <T>(callback: () => T) => callback() } },
    counters,
  };
}

function request(identityKey: string, tier: "authenticated" | "guest", now = 0) {
  return new Request("https://quota.internal/check", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identityKey, tier, now }),
  });
}

test("guest minute quota is exact and increments the global counter", async () => {
  const { state, counters } = createState();
  const object = new HibalagAiQuota(state);
  const key = "a".repeat(64);
  for (let index = 0; index < AI_QUOTAS.guest.minute; index += 1) {
    assert.deepEqual(await (await object.fetch(request(key, "guest"))).json(), { allowed: true });
  }
  const denied = (await object.fetch(request(key, "guest"))) as Response;
  assert.equal(denied.status, 200);
  assert.equal(((await denied.json()) as { allowed: boolean }).allowed, false);
  assert.equal(counters.get("global:day:0")?.count, AI_QUOTAS.guest.minute);
});

test("global daily ceiling is shared across fictional authenticated identities", async () => {
  const { state } = createState();
  const object = new HibalagAiQuota(state);
  for (let index = 0; index < AI_QUOTAS.globalDay; index += 1) {
    const key = index.toString(16).padStart(64, "0");
    assert.equal((await (await object.fetch(request(key, "authenticated"))).json()).allowed, true);
  }
  const denied = await object.fetch(request("f".repeat(64), "authenticated"));
  assert.equal(((await denied.json()) as { allowed: boolean }).allowed, false);
});

test("malformed internal quota requests do not write counters", async () => {
  const { state, counters } = createState();
  const object = new HibalagAiQuota(state);
  const response = await object.fetch(
    new Request("https://quota.internal/check", {
      method: "POST",
      body: JSON.stringify({ identityKey: "raw-ip-address", tier: "guest", now: 0 }),
    }),
  );
  assert.equal(response.status, 400);
  assert.equal(counters.size, 0);
});
