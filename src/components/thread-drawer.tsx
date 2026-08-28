import { Check, LogIn, LogOut, Pencil, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n-context";
import type { Thread } from "@/lib/threads";
import { cn } from "@/lib/utils";

type ThreadDrawerProps = {
  open: boolean;
  onClose: () => void;
  threads: Thread[];
  activeThreadId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (thread: Thread, title: string) => void;
  onDelete: (id: string) => void;
  email: string | null;
  onLogin: () => void;
  onLogout: () => void;
  pendingLocalCount: number;
  onMigrate: () => void;
};

export function ThreadDrawer({
  open,
  onClose,
  threads,
  activeThreadId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  email,
  onLogin,
  onLogout,
  pendingLocalCount,
  onMigrate,
}: ThreadDrawerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const { t } = useI18n();

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[2px] transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Chat history"
      >
        <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5">
          <p className="font-display flex-1 text-sm font-semibold">{t("threads.title")}</p>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label={t("threads.close")}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-3">
          <Button className="w-full" onClick={onNew}>
            <Plus className="mr-1.5 size-4" /> {t("threads.new")}
          </Button>
        </div>

        {email && pendingLocalCount > 0 ? (
          <div className="mx-3 mb-3 rounded-xl border border-border bg-background p-3 text-xs">
            <p className="text-muted-foreground">
              {t("threads.migrateBody", { count: pendingLocalCount })}
            </p>
            <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={onMigrate}>
              <UploadCloud className="mr-1.5 size-3.5" /> {t("threads.migrateAction")}
            </Button>
          </div>
        ) : null}

        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {threads.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              {t("threads.empty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {threads.map((thread) => {
                const active = thread.id === activeThreadId;
                const editing = editingId === thread.id;
                return (
                  <li
                    key={thread.id}
                    className={cn(
                      "group flex items-center gap-1 rounded-xl px-2 py-1.5 transition-colors",
                      active ? "bg-accent" : "hover:bg-accent/60",
                    )}
                  >
                    {editing ? (
                      <>
                        <Input
                          value={draft}
                          autoFocus
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              onRename(thread, draft.trim() || thread.title);
                              setEditingId(null);
                            }
                            if (event.key === "Escape") setEditingId(null);
                          }}
                          className="h-8 text-xs"
                        />
                        <button
                          type="button"
                          aria-label={t("threads.save")}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            onRename(thread, draft.trim() || thread.title);
                            setEditingId(null);
                          }}
                        >
                          <Check className="size-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelect(thread.id)}
                          className="min-w-0 flex-1 truncate text-left text-xs font-medium"
                        >
                          {thread.title}
                        </button>
                        <button
                          type="button"
                          aria-label={t("threads.rename", { title: thread.title })}
                          className="rounded-md p-1.5 text-muted-foreground opacity-100 hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          onClick={() => {
                            setEditingId(thread.id);
                            setDraft(thread.title);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={t("threads.delete", { title: thread.title })}
                          className="rounded-md p-1.5 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          onClick={() => onDelete(thread.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border/70 p-3">
          {email ? (
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{email}</p>
              <Button size="sm" variant="ghost" onClick={onLogout}>
                <LogOut className="mr-1.5 size-3.5" /> {t("threads.logout")}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="w-full" onClick={onLogin}>
              <LogIn className="mr-1.5 size-3.5" /> {t("threads.login")}
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
