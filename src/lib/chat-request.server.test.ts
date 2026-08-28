import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAT_LIMITS,
  ChatRequestError,
  boundScheduleContext,
  parseChatRequest,
  readBoundedChatBody,
  rejectOversizedContentLength,
} from "./chat-request.server.ts";

const userMessage = {
  id: "fictional-user-message",
  role: "user",
  parts: [{ type: "text", text: "What fictional events are scheduled?" }],
};

test("accepts a bounded fictional UI message and known language", () => {
  const result = parseChatRequest(JSON.stringify({ messages: [userMessage], language: "english" }));
  assert.equal(result.messages.length, 1);
  assert.equal(result.language, "english");
});

test("rejects malformed JSON without echoing its contents", () => {
  assert.throws(
    () => parseChatRequest('{"messages":['),
    (error: unknown) => error instanceof ChatRequestError && error.message === "Invalid JSON",
  );
});

test("rejects an oversized declared request before reading it", () => {
  assert.throws(
    () => rejectOversizedContentLength(String(CHAT_LIMITS.requestBytes + 1)),
    (error: unknown) => error instanceof ChatRequestError && error.status === 413,
  );
});

test("stops reading an oversized body when content length is unavailable", async () => {
  const request = new Request("https://example.invalid/api/chat", {
    method: "POST",
    body: "x".repeat(CHAT_LIMITS.requestBytes + 1),
  });
  request.headers.delete("content-length");
  await assert.rejects(
    readBoundedChatBody(request),
    (error: unknown) => error instanceof ChatRequestError && error.status === 413,
  );
});

test("rejects excessive history", () => {
  const messages = Array.from({ length: CHAT_LIMITS.messages + 1 }, () => userMessage);
  assert.throws(
    () => parseChatRequest(JSON.stringify({ messages })),
    (error: unknown) => error instanceof ChatRequestError && error.message === "Too many messages",
  );
});

test("rejects oversized individual messages", () => {
  const message = {
    ...userMessage,
    parts: [{ type: "text", text: "x".repeat(CHAT_LIMITS.messageBytes) }],
  };
  assert.throws(
    () => parseChatRequest(JSON.stringify({ messages: [message] })),
    (error: unknown) =>
      error instanceof ChatRequestError && error.message === "Message is too large",
  );
});

test("rejects system roles and conversations that do not end with a user message", () => {
  assert.throws(() =>
    parseChatRequest(JSON.stringify({ messages: [{ ...userMessage, role: "system" }] })),
  );
  assert.throws(() =>
    parseChatRequest(JSON.stringify({ messages: [{ ...userMessage, role: "assistant" }] })),
  );
});

test("rejects unknown languages and ignores client-supplied schedule context", () => {
  assert.throws(() =>
    parseChatRequest(JSON.stringify({ messages: [userMessage], language: "fictional-language" })),
  );
  const result = parseChatRequest(
    JSON.stringify({ messages: [userMessage], scheduleMarkdown: "untrusted schedule override" }),
  );
  assert.deepEqual(Object.keys(result).sort(), ["language", "messages"]);
});

test("bounds server-supplied schedule context", () => {
  const schedule = "x".repeat(CHAT_LIMITS.scheduleCharacters + 100);
  assert.equal(boundScheduleContext(schedule)?.length, CHAT_LIMITS.scheduleCharacters);
  assert.equal(boundScheduleContext(null), null);
});
