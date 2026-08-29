import type { UIMessage } from "ai";

import { AI_QUOTAS } from "./ai-quota-do.ts";
import { CHAT_LIMITS } from "./chat-request.server.ts";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./supabase.ts";

export const CLOUDFLARE_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

type AiRunInput = {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  max_tokens: number;
};

export type WorkersAiBinding = {
  run(model: string, input: AiRunInput): Promise<unknown>;
};

type DurableObjectStub = {
  fetch(request: Request): Promise<Response>;
};

export type DurableObjectNamespace = {
  idFromName(name: string): unknown;
  get(id: unknown): DurableObjectStub;
};

export type CloudflareAiEnv = {
  AI?: WorkersAiBinding;
  AI_QUOTA?: DurableObjectNamespace;
  AI_ENABLED?: string;
  AI_RATE_LIMIT_PEPPER?: string;
  ASSETS?: unknown;
};

declare global {
  // Nitro's Cloudflare module adapter sets this to the current binding object.
  // All Hibalag bindings are isolate-wide and therefore identical across requests.
  var __env__: CloudflareAiEnv | undefined;
}

export class AiAccessError extends Error {
  readonly status: 401 | 429 | 503;
  readonly code:
    | "disabled"
    | "invalid-auth"
    | "identity-unavailable"
    | "quota-unavailable"
    | "quota-exhausted"
    | "provider-unavailable";
  readonly retryAfterSeconds: number | undefined;
  readonly providerCode: string | undefined;

  constructor(
    message: string,
    status: 401 | 429 | 503,
    code:
      | "disabled"
      | "invalid-auth"
      | "identity-unavailable"
      | "quota-unavailable"
      | "quota-exhausted"
      | "provider-unavailable",
    retryAfterSeconds?: number,
    providerCode?: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
    this.providerCode = providerCode;
  }
}

const SAFE_CLOUDFLARE_AI_ERROR_CODES = new Set([
  "3003",
  "3006",
  "3007",
  "3008",
  "3023",
  "3036",
  "3040",
  "3041",
  "3042",
  "5004",
  "5005",
  "5007",
  "5016",
  "5018",
  "5019",
  "5035",
]);

function safeCloudflareAiErrorCode(error: unknown) {
  if (!(error instanceof Error)) return undefined;
  const directCode = "code" in error ? String(error.code) : "";
  if (SAFE_CLOUDFLARE_AI_ERROR_CODES.has(directCode)) return directCode;
  const messageCode = error.message.match(
    /\b(?:3003|3006|3007|3008|3023|3036|3040|3041|3042|5004|5005|5007|5016|5018|5019|5035)\b/,
  )?.[0];
  return messageCode && SAFE_CLOUDFLARE_AI_ERROR_CODES.has(messageCode) ? messageCode : undefined;
}

type AiIdentity = { tier: "authenticated" | "guest"; value: string };

export type CloudflareAiDependencies = {
  fetch: typeof fetch;
  now: () => number;
  timeoutMs: number;
};

const defaultDependencies: CloudflareAiDependencies = {
  fetch: (...args) => fetch(...args),
  now: () => Date.now(),
  timeoutMs: CHAT_LIMITS.timeoutMs,
};

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  if (!match) throw new AiAccessError("Invalid authentication", 401, "invalid-auth");
  return match[1];
}

async function authenticatedIdentity(
  token: string,
  dependencies: CloudflareAiDependencies,
): Promise<AiIdentity> {
  let response: Response;
  try {
    response = await dependencies.fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new AiAccessError("Authentication is temporarily unavailable", 503, "invalid-auth");
  }
  if (!response.ok) throw new AiAccessError("Invalid authentication", 401, "invalid-auth");
  const body = (await response.json().catch(() => null)) as { id?: unknown } | null;
  if (!body || typeof body.id !== "string" || !body.id) {
    throw new AiAccessError("Invalid authentication", 401, "invalid-auth");
  }
  return { tier: "authenticated", value: body.id };
}

async function requestIdentity(
  request: Request,
  dependencies: CloudflareAiDependencies,
): Promise<AiIdentity> {
  const token = bearerToken(request);
  if (token) return authenticatedIdentity(token, dependencies);

  const address = request.headers.get("cf-connecting-ip")?.trim();
  if (!address) {
    throw new AiAccessError(
      "Guest identity is temporarily unavailable",
      503,
      "identity-unavailable",
    );
  }
  return { tier: "guest", value: address };
}

async function hmacIdentity(pepper: string, identity: AiIdentity) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${identity.tier}:${identity.value}`),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function enforceQuota(
  env: CloudflareAiEnv,
  identity: AiIdentity,
  dependencies: CloudflareAiDependencies,
) {
  if (!env.AI_QUOTA || !env.AI_RATE_LIMIT_PEPPER || env.AI_RATE_LIMIT_PEPPER.length < 32) {
    throw new AiAccessError("Live AI quota protection is unavailable", 503, "quota-unavailable");
  }
  const identityKey = await hmacIdentity(env.AI_RATE_LIMIT_PEPPER, identity);
  const stub = env.AI_QUOTA.get(env.AI_QUOTA.idFromName("global-ai-quota"));
  let response: Response;
  try {
    response = await stub.fetch(
      new Request("https://quota.internal/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identityKey, tier: identity.tier, now: dependencies.now() }),
      }),
    );
  } catch {
    throw new AiAccessError("Live AI quota protection is unavailable", 503, "quota-unavailable");
  }
  const result = (await response.json().catch(() => null)) as {
    allowed?: unknown;
    retryAfterSeconds?: unknown;
  } | null;
  if (!response.ok || !result || typeof result.allowed !== "boolean") {
    throw new AiAccessError("Live AI quota protection is unavailable", 503, "quota-unavailable");
  }
  if (!result.allowed) {
    const retryAfterSeconds =
      typeof result.retryAfterSeconds === "number" ? result.retryAfterSeconds : undefined;
    throw new AiAccessError(
      "The free live AI allowance is temporarily exhausted",
      429,
      "quota-exhausted",
      retryAfterSeconds,
    );
  }
}

function messageText(message: UIMessage) {
  return message.parts
    .filter(
      (part): part is Extract<(typeof message.parts)[number], { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("")
    .trim();
}

export function buildWorkersAiMessages(
  system: string,
  messages: UIMessage[],
): AiRunInput["messages"] {
  return [
    { role: "system", content: system },
    ...messages.map((message) => ({
      role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: messageText(message),
    })),
  ];
}

export function parseWorkersAiText(value: unknown) {
  let text: unknown;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    text = record.response;
    if (typeof text !== "string" && Array.isArray(record.choices)) {
      const first = record.choices[0] as { message?: { content?: unknown } } | undefined;
      text = first?.message?.content;
    }
  }
  if (typeof text !== "string" || !text.trim()) {
    throw new AiAccessError("Live AI returned an invalid response", 503, "provider-unavailable");
  }
  return text.trim().slice(0, CHAT_LIMITS.outputCharacters);
}

export async function runCloudflareAi(
  request: Request,
  system: string,
  messages: UIMessage[],
  env: CloudflareAiEnv = globalThis.__env__ ?? {},
  dependencies: CloudflareAiDependencies = defaultDependencies,
) {
  if (env.AI_ENABLED !== "true") {
    throw new AiAccessError("Live AI is disabled", 503, "disabled");
  }
  if (!env.AI) throw new AiAccessError("Live AI is unavailable", 503, "provider-unavailable");

  const identity = await requestIdentity(request, dependencies);
  await enforceQuota(env, identity, dependencies);

  try {
    const output = await Promise.race([
      env.AI.run(CLOUDFLARE_AI_MODEL, {
        messages: buildWorkersAiMessages(system, messages),
        max_tokens: CHAT_LIMITS.outputTokens,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new AiAccessError("Live AI timed out", 503, "provider-unavailable")),
          dependencies.timeoutMs,
        ),
      ),
    ]);
    return parseWorkersAiText(output);
  } catch (error) {
    if (error instanceof AiAccessError) throw error;
    throw new AiAccessError(
      "Live AI is temporarily unavailable",
      503,
      "provider-unavailable",
      undefined,
      safeCloudflareAiErrorCode(error),
    );
  }
}
