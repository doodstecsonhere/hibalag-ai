export type MessageIdentity = {
  id?: string;
  role: "user" | "assistant";
  content: string;
};

export type StableMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function messageSignature(messages: MessageIdentity[]) {
  return messages
    .map((message) => `${message.id ?? ""}\u0000${message.role}\u0000${message.content}`)
    .join("\u0001");
}

export function stabilizeMessages(
  messages: MessageIdentity[],
  ids: Map<string, string>,
  createdAt: Map<string, string>,
  createId: () => string,
  createTimestamp: (index: number) => string,
): StableMessage[] {
  return messages.map((message, index) => {
    const sourceKey = message.id || `${message.role}:${index}:${message.content}`;
    let stableId = ids.get(sourceKey);
    if (!isUuid(stableId)) {
      stableId = isUuid(message.id) ? message.id : createId();
      ids.set(sourceKey, stableId);
    }

    let stableCreatedAt = createdAt.get(sourceKey);
    if (!stableCreatedAt) {
      stableCreatedAt = createTimestamp(index);
      createdAt.set(sourceKey, stableCreatedAt);
    }

    return {
      id: stableId,
      role: message.role,
      content: message.content,
      createdAt: stableCreatedAt,
    };
  });
}

export function preserveThreadMetadata<T extends { id: string; title: string; createdAt: string }>(
  next: T,
  existing: T | undefined,
): T {
  return existing ? { ...next, title: existing.title, createdAt: existing.createdAt } : next;
}

export function createRemovalGuard() {
  const removedIds = new Set<string>();

  return {
    blocks(id: string) {
      return removedIds.has(id);
    },
    async remove(id: string, operation: (id: string) => Promise<void> | void) {
      removedIds.add(id);
      try {
        await operation(id);
      } catch (error) {
        removedIds.delete(id);
        throw error;
      }
    },
  };
}
