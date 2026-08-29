import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, Loader2, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import type { Language } from "@/hooks/use-hibalag";
import { useI18n } from "@/lib/i18n-context";
import type { TranslationKey } from "@/lib/i18n";
import { answerOffline, type OfflineFilters } from "@/lib/offline-ai";
import { supabase } from "@/lib/supabase";
import { messageSignature, stabilizeMessages, type MessageIdentity } from "@/lib/thread-state";
import { cn } from "@/lib/utils";
import {
  createThreadStore,
  newId,
  titleFromMessage,
  type StoredMessage,
  type Thread,
} from "@/lib/threads";

const SUGGESTION_KEYS: TranslationKey[] = [
  "chat.suggestion1",
  "chat.suggestion2",
  "chat.suggestion3",
  "chat.suggestion4",
  "chat.suggestion5",
];

function messageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

function textMessage(id: string, role: "user" | "assistant", text: string): UIMessage {
  return { id, role, parts: [{ type: "text", text }] } as UIMessage;
}

type ChatPanelProps = {
  threadId: string;
  initialMessages: StoredMessage[];
  language: Language;
  online: boolean;
  userId: string | null;
  onThreadSaved: () => void;
  onOfflineMatch?: (filters: OfflineFilters) => void;
};

export function ChatPanel({
  threadId,
  initialMessages,
  language,
  online,
  userId,
  onThreadSaved,
  onOfflineMatch,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const store = useMemo(() => createThreadStore(userId), [userId]);
  const { t } = useI18n();

  const [offlineMessages, setOfflineMessages] = useState<UIMessage[]>([]);
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [liveFailure, setLiveFailure] = useState<"quota" | "unavailable" | null>(null);
  const lastQueryRef = useRef("");
  const handledErrorRef = useRef<unknown>(null);
  const stableIdsRef = useRef(new Map(initialMessages.map((message) => [message.id, message.id])));
  const stableCreatedAtRef = useRef(
    new Map(initialMessages.map((message) => [message.id, message.createdAt])),
  );
  const initialUiMessages = useMemo(
    () => initialMessages.map((message) => textMessage(message.id, message.role, message.content)),
    [initialMessages],
  );
  const lastSavedSignatureRef = useRef(
    messageSignature(
      initialUiMessages.map((message) => ({
        id: message.id,
        role: message.role === "assistant" ? "assistant" : "user",
        content: messageText(message),
      })),
    ),
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialUiMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { language },
      fetch: async (input, init) => {
        const { data } = await supabase.auth.getSession();
        const headers = new Headers(init?.headers);
        if (data.session?.access_token) {
          headers.set("authorization", `Bearer ${data.session.access_token}`);
        }
        const response = await fetch(input, { ...init, headers });
        if (response.ok) {
          setLiveFailure(null);
        } else {
          setLiveFailure(
            response.headers.get("x-hibalag-ai-status") === "quota-exhausted"
              ? "quota"
              : "unavailable",
          );
        }
        return response;
      },
    }),
  });

  const busy = status === "submitted" || status === "streaming" || offlineBusy;
  const allMessages = useMemo(() => [...messages, ...offlineMessages], [messages, offlineMessages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [allMessages, busy]);

  useEffect(() => {
    if (busy || allMessages.length === 0) return;
    const identities: MessageIdentity[] = allMessages.map((message) => ({
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      content: messageText(message),
    }));
    const signature = messageSignature(identities);
    if (signature === lastSavedSignatureRef.current) return;
    const baseTime = Date.now();
    const stored: StoredMessage[] = stabilizeMessages(
      identities,
      stableIdsRef.current,
      stableCreatedAtRef.current,
      newId,
      (index) => new Date(baseTime + index).toISOString(),
    );
    const now = new Date().toISOString();
    const thread: Thread = {
      id: threadId,
      title: titleFromMessage(stored.find((m) => m.role === "user")?.content ?? ""),
      createdAt: stored[0]?.createdAt ?? now,
      updatedAt: now,
    };
    void store
      .save(thread, stored)
      .then(() => {
        lastSavedSignatureRef.current = signature;
        onThreadSaved();
      })
      .catch(() => undefined);
  }, [allMessages, busy, store, threadId, onThreadSaved]);

  /** Generates and "streams" a grounded reply from the cached schedule, locally. */
  const runOffline = useCallback(
    async (value: string, includeUser: boolean, unavailable = false) => {
      const stamp = Date.now();
      const assistantId = `off-a-${stamp}`;
      setOfflineBusy(true);
      setOfflineMessages((prev) => [
        ...prev,
        ...(includeUser ? [textMessage(`off-u-${stamp}`, "user", value)] : []),
        textMessage(assistantId, "assistant", ""),
      ]);

      let result;
      try {
        result = await answerOffline(value, language, unavailable ? "unavailable" : "offline");
      } catch {
        result = {
          text: t(unavailable ? "fallback.noCache" : "offline.noCache"),
          events: [],
          filters: null,
        };
      }

      if (result.filters) onOfflineMatch?.(result.filters);

      const chunks = result.text.split(/(\s+)/);
      let acc = "";
      for (let index = 0; index < chunks.length; index += 1) {
        acc += chunks[index];
        const snapshot = acc;
        setOfflineMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId ? textMessage(assistantId, "assistant", snapshot) : message,
          ),
        );
        if (index % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 18));
      }

      setOfflineBusy(false);
    },
    [language, onOfflineMatch, t],
  );

  // If the live gateway fails while "online", degrade to the cached answer
  // instead of leaving the user on a dead end.
  useEffect(() => {
    if (!error || handledErrorRef.current === error || !lastQueryRef.current) return;
    handledErrorRef.current = error;
    setLiveFailure((current) => current ?? "unavailable");
    void runOffline(lastQueryRef.current, false, true);
  }, [error, runOffline]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    lastQueryRef.current = value;

    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (isOffline) {
      void runOffline(value, true);
      return;
    }
    void sendMessage({ text: value });
  };

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label={t("chat.aria")}>
      {!online || liveFailure ? (
        <div
          role="status"
          className="flex items-center gap-2 bg-muted px-4 py-2 text-xs text-muted-foreground"
        >
          <Zap className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {t(
              liveFailure === "quota" && online
                ? "fallback.quota"
                : liveFailure && online
                  ? "fallback.banner"
                  : "offline.banner",
            )}
          </span>
        </div>
      ) : null}

      <div ref={scrollRef} className="scrollbar-slim smooth-scroll-y min-h-0 flex-1 px-4 py-5">
        {allMessages.length === 0 ? (
          <div className="mx-auto max-w-md py-8 text-center">
            <h2 className="font-display text-2xl font-semibold">{t("chat.welcomeTitle")}</h2>
            <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
              {t("chat.welcomeBody")}
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {allMessages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "animate-rise max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-[var(--shadow-elev)]",
                      isUser
                        ? "bg-bubble-user text-bubble-user-foreground rounded-br-md"
                        : "bg-bubble-ai text-bubble-ai-foreground rounded-bl-md border border-border/70",
                    )}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{messageText(message)}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none prose-headings:font-display prose-p:my-2 prose-ul:my-2 prose-strong:text-foreground dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {messageText(message) || "…"}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {busy ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden /> {t("chat.thinking")}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border/70 bg-card/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="scrollbar-slim -mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {SUGGESTION_KEYS.map((key) => {
            const suggestion = t(key);
            return (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => submit(suggestion)}
                className="min-h-11 shrink-0 rounded-full border border-border bg-background px-4 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                {suggestion}
              </button>
            );
          })}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            aria-label={t("chat.placeholder")}
            placeholder={t("chat.placeholder")}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm"
          />

          <Button
            type="submit"
            size="icon"
            className="size-11 rounded-2xl"
            disabled={busy || !input.trim()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            <span className="sr-only">{t("chat.send")}</span>
          </Button>
        </form>
      </div>
    </section>
  );
}
