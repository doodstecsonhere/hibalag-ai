import assert from "node:assert/strict";
import test from "node:test";

import {
  createRemovalGuard,
  isUuid,
  messageSignature,
  preserveThreadMetadata,
  stabilizeMessages,
} from "./thread-state.ts";

const FIRST_UUID = "00000000-0000-4000-8000-000000000001";
const SECOND_UUID = "00000000-0000-4000-8000-000000000002";

test("generated and offline message ids become stable UUIDs", () => {
  const ids = new Map<string, string>();
  const dates = new Map<string, string>();
  const messages = [
    { id: "msg-generated", role: "user" as const, content: "Fictional question" },
    { id: "off-a-123", role: "assistant" as const, content: "Fictional answer" },
  ];
  const generated = [FIRST_UUID, SECOND_UUID];
  let generatedIndex = 0;

  const first = stabilizeMessages(
    messages,
    ids,
    dates,
    () => generated[generatedIndex++],
    (index) => `2026-08-28T00:00:0${index}.000Z`,
  );
  const second = stabilizeMessages(
    messages,
    ids,
    dates,
    () => {
      throw new Error("stable messages must not generate replacement ids");
    },
    () => {
      throw new Error("stable messages must not generate replacement timestamps");
    },
  );

  assert.deepEqual(second, first);
  assert.ok(first.every((message) => isUuid(message.id)));
});

test("existing UUID and timestamp survive conversation restoration", () => {
  const ids = new Map([[FIRST_UUID, FIRST_UUID]]);
  const dates = new Map([[FIRST_UUID, "2026-08-27T00:00:00.000Z"]]);
  const result = stabilizeMessages(
    [{ id: FIRST_UUID, role: "user", content: "Stored question" }],
    ids,
    dates,
    () => SECOND_UUID,
    () => "2026-08-28T00:00:00.000Z",
  );

  assert.equal(result[0].id, FIRST_UUID);
  assert.equal(result[0].createdAt, "2026-08-27T00:00:00.000Z");
});

test("saving messages preserves an existing conversation title and creation time", () => {
  const existing = {
    id: FIRST_UUID,
    title: "Manually named conversation",
    createdAt: "2026-08-27T00:00:00.000Z",
    updatedAt: "2026-08-27T00:01:00.000Z",
  };
  const next = {
    ...existing,
    title: "Unsa'y events karong adlawa?",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:01:00.000Z",
  };

  assert.deepEqual(preserveThreadMetadata(next, existing), {
    ...next,
    title: existing.title,
    createdAt: existing.createdAt,
  });
});

test("message signatures change only when conversation content changes", () => {
  const initial = [{ id: FIRST_UUID, role: "user" as const, content: "Question" }];
  assert.equal(messageSignature(initial), messageSignature([...initial]));
  assert.notEqual(
    messageSignature(initial),
    messageSignature([...initial, { id: SECOND_UUID, role: "assistant", content: "Answer" }]),
  );
});

test("a successful deletion permanently blocks stale saves for that thread id", async () => {
  const guard = createRemovalGuard();
  await guard.remove(FIRST_UUID, () => undefined);
  assert.equal(guard.blocks(FIRST_UUID), true);
  assert.equal(guard.blocks(SECOND_UUID), false);
});

test("a failed deletion releases the guard so the visible thread can be restored", async () => {
  const guard = createRemovalGuard();
  await assert.rejects(
    guard.remove(FIRST_UUID, () => Promise.reject(new Error("fictional failure"))),
  );
  assert.equal(guard.blocks(FIRST_UUID), false);
});
