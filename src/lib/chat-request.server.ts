import type { UIMessage } from "ai";

export const CHAT_LIMITS = {
  requestBytes: 64 * 1024,
  messages: 24,
  messageBytes: 8 * 1024,
  scheduleCharacters: 32_000,
  outputTokens: 800,
  outputCharacters: 8_000,
  timeoutMs: 15_000,
} as const;

const LANGUAGES = new Set(["auto", "bisaya", "english", "tagalog"]);
const ROLES = new Set(["user", "assistant"]);
const encoder = new TextEncoder();

export type ChatLanguage = "bisaya" | "tagalog" | "english" | "auto";

export type ValidatedChatRequest = {
  messages: UIMessage[];
  language: ChatLanguage;
};

export class ChatRequestError extends Error {
  readonly status: 400 | 413;

  constructor(message: string, status: 400 | 413) {
    super(message);
    this.status = status;
  }
}

function byteLength(value: string) {
  return encoder.encode(value).byteLength;
}

export function rejectOversizedContentLength(value: string | null) {
  if (!value) return;
  const length = Number(value);
  if (Number.isFinite(length) && length > CHAT_LIMITS.requestBytes) {
    throw new ChatRequestError("Chat request is too large", 413);
  }
}

export async function readBoundedChatBody(request: Request) {
  rejectOversizedContentLength(request.headers.get("content-length"));
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;

  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > CHAT_LIMITS.requestBytes) {
      await reader.cancel("Chat request is too large");
      throw new ChatRequestError("Chat request is too large", 413);
    }
    chunks.push(chunk.value);
  }

  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export function parseChatRequest(text: string): ValidatedChatRequest {
  if (byteLength(text) > CHAT_LIMITS.requestBytes) {
    throw new ChatRequestError("Chat request is too large", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ChatRequestError("Invalid JSON", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ChatRequestError("Invalid chat request", 400);
  }

  const candidate = body as Record<string, unknown>;
  if (!Array.isArray(candidate.messages) || candidate.messages.length === 0) {
    throw new ChatRequestError("Messages are required", 400);
  }
  if (candidate.messages.length > CHAT_LIMITS.messages) {
    throw new ChatRequestError("Too many messages", 413);
  }

  for (const message of candidate.messages) {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      throw new ChatRequestError("Invalid message", 400);
    }
    const role = (message as Record<string, unknown>).role;
    if (typeof role !== "string" || !ROLES.has(role)) {
      throw new ChatRequestError("Invalid message role", 400);
    }
    if (byteLength(JSON.stringify(message)) > CHAT_LIMITS.messageBytes) {
      throw new ChatRequestError("Message is too large", 413);
    }
  }

  const lastMessage = candidate.messages.at(-1) as Record<string, unknown>;
  if (lastMessage.role !== "user") {
    throw new ChatRequestError("The last message must be from the user", 400);
  }

  const language = candidate.language ?? "auto";
  if (typeof language !== "string" || !LANGUAGES.has(language)) {
    throw new ChatRequestError("Invalid language", 400);
  }

  return {
    messages: candidate.messages as UIMessage[],
    language: language as ChatLanguage,
  };
}

export function boundScheduleContext(markdown: string | null) {
  if (!markdown) return null;
  return markdown.slice(0, CHAT_LIMITS.scheduleCharacters);
}
