import { useNavigate } from "@tanstack/react-router";
import { CalendarRange, Menu } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AuthDialog } from "@/components/auth-dialog";
import { CanvasPanel, type CanvasFilters } from "@/components/canvas-panel";
import { ChatPanel } from "@/components/chat-panel";
import { InstallPrompt } from "@/components/install-prompt";
import { ThreadDrawer } from "@/components/thread-drawer";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
const logo = "/apple-touch-icon.png";
import {
  useInstallPrompt,
  useOnlineStatus,
  useOptionalAuth,
  type Language,
} from "@/hooks/use-hibalag";

import { LANGUAGE_LABELS } from "@/lib/i18n";
import { LanguageProvider, useI18n } from "@/lib/i18n-context";
import { loadSchedule, type ScheduleEvent } from "@/lib/schedule";

import { supabase } from "@/lib/supabase";
import {
  createThreadStore,
  localThreadCount,
  migrateLocalThreads,
  newId,
  type StoredMessage,
  type Thread,
} from "@/lib/threads";
import { cn } from "@/lib/utils";

const LANGUAGE_OPTIONS: Language[] = ["bisaya", "english", "tagalog"];

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function HibalagApp({ threadId }: { threadId: string }) {
  return (
    <LanguageProvider>
      <HibalagShell threadId={threadId} />
    </LanguageProvider>
  );
}

function HibalagShell({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useI18n();

  const online = useOnlineStatus();
  const { user } = useOptionalAuth();
  const install = useInstallPrompt();
  const store = useMemo(() => createThreadStore(user?.id ?? null), [user?.id]);

  const [threads, setThreads] = useState<Thread[]>([]);
  const [initialMessages, setInitialMessages] = useState<StoredMessage[] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [localCount, setLocalCount] = useState(0);

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [filters, setFilters] = useState<CanvasFilters>({
    date: todayIso(),
    categories: [],
    query: "",
  });

  const refreshThreads = useCallback(() => {
    store
      .list()
      .then(setThreads)
      .catch(() => setThreads([]));
  }, [store]);

  // Hydrate from local storage immediately; re-runs once auth resolves (store
  // identity changes), so nothing waits on a network round-trip.
  useEffect(() => {
    refreshThreads();
    setLocalCount(user ? localThreadCount() : 0);
  }, [refreshThreads, user]);

  useEffect(() => {
    let cancelled = false;
    setInitialMessages(null);
    store
      .read(threadId)
      .then((stored) => {
        if (!cancelled) setInitialMessages(stored);
      })
      .catch(() => {
        if (!cancelled) setInitialMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [store, threadId]);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    loadSchedule({
      onRevalidated: (fresh) => {
        setEvents(fresh.events);
        setFromCache(false);
      },
    })
      .then((payload) => {
        setEvents(payload.events);
        setFromCache(payload.fromCache);
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(refresh, [refresh]);

  // Reconnection: announce the live gateway coming back without a reload.
  const wasOffline = useRef(false);
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      toast.success(t("offline.reconnected"));
      refresh();
    }
  }, [online, t, refresh]);

  const liveCount = useMemo(() => {
    const iso = todayIso();
    return events.filter((event) => event.date === iso).length;
  }, [events]);

  const scheduleLabel =
    liveCount > 0
      ? `${t("header.schedule")} — ${t("header.scheduleToday", { count: liveCount })}`
      : t("header.schedule");

  const goToThread = useCallback(
    (id: string) => {
      setDrawerOpen(false);
      setInitialMessages(null);
      void navigate({ to: "/chat/$threadId", params: { threadId: id } });
    },
    [navigate],
  );

  const handleNew = useCallback(() => goToThread(newId()), [goToThread]);

  const handleDelete = useCallback(
    (id: string) => {
      setThreads((current) => current.filter((thread) => thread.id !== id));
      if (id === threadId) handleNew();
      void store.remove(id).then(refreshThreads).catch(refreshThreads);
    },
    [store, refreshThreads, threadId, handleNew],
  );

  const handleRename = useCallback(
    (thread: Thread, title: string) => {
      void store.rename(thread, title).finally(refreshThreads);
    },
    [store, refreshThreads],
  );

  const handleMigrate = useCallback(() => {
    if (!user) return;
    void migrateLocalThreads(user.id).finally(() => {
      setLocalCount(0);
      refreshThreads();
    });
  }, [user, refreshThreads]);

  return (
    <div className="festive-grain flex h-dvh flex-col bg-background pt-[env(safe-area-inset-top)]">
      <h1 className="sr-only">Hibalag AI: Silliman Founders Week Guide</h1>
      <header className="z-20 grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 bg-card/85 px-2 py-1.5 backdrop-blur sm:px-3 sm:py-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("header.menu")}
            className="size-11"
          >
            <Menu className="size-5" />
          </Button>
          <img
            src={logo}
            alt="Hibalag AI"
            width={36}
            height={36}
            decoding="async"
            fetchPriority="high"
            className="hidden size-9 shrink-0 rounded-xl sm:block"
          />
        </div>

        <div className="min-w-0">
          <p className="truncate font-display text-sm leading-tight font-semibold">Hibalag AI</p>
          <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                online ? "animate-live-pulse bg-chart-4" : "bg-muted-foreground",
              )}
            />
            <span className="truncate">
              {online ? t("header.status.active") : t("header.status.offline")}
              {user ? ` · ${t("header.status.synced")}` : ""}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <div
            role="group"
            aria-label={t("header.language")}
            className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-background p-0.5"
          >
            {LANGUAGE_OPTIONS.map((option) => {
              const active = language === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setLanguage(option)}
                  className={cn(
                    "min-h-10 min-w-10 rounded-full px-2 text-[11px] font-semibold transition-colors sm:min-h-11 sm:px-3",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  <span className="sm:hidden">{LANGUAGE_LABELS[option].short}</span>
                  <span className="hidden sm:inline">{LANGUAGE_LABELS[option].full}</span>
                </button>
              );
            })}
          </div>

          <Button
            variant="secondary"
            onClick={() => setCanvasOpen(true)}
            aria-label={scheduleLabel}
            title={scheduleLabel}
            className="relative size-11 shrink-0 rounded-full p-0 lg:hidden"
          >
            <CalendarRange className="size-5" />
            {liveCount > 0 ? (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full border border-primary/40 bg-primary/10 px-1 text-[10px] font-bold text-primary"
              >
                {liveCount}
              </span>
            ) : null}
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="min-h-0 min-w-0">
          {initialMessages ? (
            <ChatPanel
              key={threadId}
              threadId={threadId}
              initialMessages={initialMessages}
              language={language}
              online={online}
              userId={user?.id ?? null}
              onThreadSaved={refreshThreads}
              onOfflineMatch={(next) =>
                setFilters({
                  date: next.date,
                  categories: next.categories,
                  query: next.query,
                })
              }
            />
          ) : null}
        </div>

        <div className="hidden min-h-0 border-l border-border/70 lg:block">
          <CanvasPanel
            events={events}
            filters={filters}
            onFiltersChange={setFilters}
            loading={loading}
            offlineCopy={fromCache && !online}
            error={error}
            onRetry={refresh}
          />
        </div>
      </main>

      {!canvasOpen ? (
        <Button
          onClick={() => setCanvasOpen(true)}
          className="fixed right-4 bottom-[calc(9rem+env(safe-area-inset-bottom))] z-40 min-h-11 rounded-full px-4 shadow-[var(--shadow-glow)] lg:hidden"
        >
          <CalendarRange className="mr-1.5 size-4" /> {t("canvas.fab")}
        </Button>
      ) : null}

      <Drawer open={canvasOpen} onOpenChange={setCanvasOpen}>
        <DrawerContent className="h-[90dvh] lg:hidden">
          <DrawerTitle className="sr-only">{t("canvas.sheetTitle")}</DrawerTitle>
          <DrawerDescription className="sr-only">{t("canvas.sheetDescription")}</DrawerDescription>

          <div className="min-h-0 flex-1">
            <CanvasPanel
              events={events}
              filters={filters}
              onFiltersChange={setFilters}
              loading={loading}
              offlineCopy={fromCache && !online}
              error={error}
              onRetry={refresh}
              onClose={() => setCanvasOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <ThreadDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        threads={threads}
        activeThreadId={threadId}
        onSelect={goToThread}
        onNew={handleNew}
        onRename={handleRename}
        onDelete={handleDelete}
        email={user?.email ?? null}
        onLogin={() => {
          setDrawerOpen(false);
          setAuthOpen(true);
        }}
        onLogout={() => {
          void supabase.auth.signOut();
        }}
        pendingLocalCount={localCount}
        onMigrate={handleMigrate}
      />

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      <InstallPrompt
        open={install.shouldPrompt}
        platform={install.platform}
        onInstall={() =>
          install.platform === "native" ? void install.install() : install.dismiss()
        }
        onDismiss={install.dismiss}
      />
    </div>
  );
}
