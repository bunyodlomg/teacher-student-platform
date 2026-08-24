"use client";

import { useChat } from "@/store/chat";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { Attachment, ChatConversation, Role, User } from "@/lib/types";
import { groupsForUser } from "@/lib/selectors";
import { cn, relativeTime } from "@/lib/utils";
import { uploadAttachment } from "@/lib/upload";
import { toast } from "@/store/toast";
import { Avatar } from "@/components/ui/Avatar";
import { Monogram } from "@/components/ui/Monogram";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttachmentChip } from "@/components/ui/Attachment";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ArrowLeft,
  Loader2,
  MessagesSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

/** HH:MM ko'rinishidagi vaqt. */
function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ConvMeta {
  title: string;
  subtitle: string;
  isGroup: boolean;
  groupSubject?: string;
  other?: User;
}

export function ChatView({ role }: { role: Role }) {
  const me = useSession((s) => s.user);
  const users = useData((s) => s.users);
  const groups = useData((s) => s.groups);

  const conversations = useChat((s) => s.conversations);
  const activeId = useChat((s) => s.activeId);
  const loadedList = useChat((s) => s.loadedList);
  const loadConversations = useChat((s) => s.loadConversations);
  const setActive = useChat((s) => s.setActive);

  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const userById = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const metaFor = useMemo(() => {
    return (c: ChatConversation): ConvMeta => {
      if (c.kind === "group") {
        const g = groups.find((x) => x.id === c.groupId);
        return {
          title: g?.name ?? "Guruh",
          subtitle: "Guruh chati",
          isGroup: true,
          groupSubject: g?.subject ?? "•",
        };
      }
      const otherId = c.participantIds.find((p) => p !== me?.id);
      const other = otherId ? userById.get(otherId) : undefined;
      return {
        title: other?.name ?? "Foydalanuvchi",
        subtitle:
          other?.role === "teacher"
            ? "O'qituvchi"
            : other?.role === "admin"
            ? "Administrator"
            : "O'quvchi",
        isGroup: false,
        other,
      };
    };
  }, [groups, userById, me?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      metaFor(c).title.toLowerCase().includes(q)
    );
  }, [conversations, query, metaFor]);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  if (!me) return null;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Suhbatlar</h1>
          <p className="text-sm text-muted">
            Guruh chatlari va shaxsiy yozishmalar
          </p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink shadow-glow-accent transition-transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          Yangi
        </button>
      </div>

      <div className="glass-card grid h-[calc(100dvh-13rem)] min-h-[420px] grid-cols-1 overflow-hidden rounded-2xl border border-border md:grid-cols-[320px_1fr]">
        {/* ---- Ro'yxat ---- */}
        <aside
          className={cn(
            "flex min-h-0 flex-col border-border md:border-r",
            active ? "hidden md:flex" : "flex"
          )}
        >
          <div className="border-b border-border p-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-elevated/50 px-3 py-2">
              <Search className="h-4 w-4 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Qidirish..."
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!loadedList ? (
              <div className="p-6 text-center text-sm text-muted">
                Yuklanmoqda...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">
                {query ? "Hech narsa topilmadi" : "Hali suhbatlar yo'q"}
              </div>
            ) : (
              filtered.map((c) => {
                const meta = metaFor(c);
                const isActive = c.id === activeId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActive(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors hover:bg-elevated/60",
                      isActive && "bg-elevated"
                    )}
                  >
                    {meta.isGroup ? (
                      <Monogram label={meta.groupSubject ?? "•"} size="md" />
                    ) : meta.other ? (
                      <Avatar user={meta.other} size="md" />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-elevated text-muted">
                        <Users className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">
                          {meta.title}
                        </p>
                        {c.lastMessageAt && (
                          <span className="ml-auto shrink-0 text-[10px] text-faint">
                            {relativeTime(c.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs text-muted">
                          {c.lastMessage
                            ? (c.lastMessage.senderId === me.id ? "Siz: " : "") +
                              c.lastMessage.body
                            : meta.subtitle}
                        </p>
                        {c.unread > 0 && (
                          <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-ink">
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ---- Tred ---- */}
        <section
          className={cn(
            "min-h-0 flex-col",
            active ? "flex" : "hidden md:flex"
          )}
        >
          {active ? (
            <Thread
              key={active.id}
              conv={active}
              meta={metaFor(active)}
              meId={me.id}
              role={role}
              userById={userById}
              onBack={() => setActive(null)}
            />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-elevated text-faint">
                  <MessagesSquare className="h-7 w-7" />
                </div>
                <p className="text-sm text-muted">
                  Suhbatni tanlang yoki yangisini boshlang
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <NewChatModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        role={role}
        me={me}
      />
    </div>
  );
}

// ============================ Tred ============================

function Thread({
  conv,
  meta,
  meId,
  role,
  userById,
  onBack,
}: {
  conv: ChatConversation;
  meta: ConvMeta;
  meId: string;
  role: Role;
  userById: Map<string, User>;
  onBack: () => void;
}) {
  const messages = useChat((s) => s.messagesByConv[conv.id]);
  const hasMore = useChat((s) => s.hasMoreByConv[conv.id]);
  const loading = useChat((s) => s.loadingMsgs[conv.id]);
  const typing = useChat((s) => s.typingByConv[conv.id]);
  const loadOlder = useChat((s) => s.loadOlder);
  const sendMessage = useChat((s) => s.sendMessage);
  const deleteMessage = useChat((s) => s.deleteMessage);
  const emitTyping = useChat((s) => s.emitTyping);

  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  // yangi xabar kelganda pastga surish
  useEffect(() => {
    const n = messages?.length ?? 0;
    if (n !== lastCount.current) {
      lastCount.current = n;
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  const send = () => {
    const t = text.trim();
    if (!t && files.length === 0) return;
    setText("");
    setFiles([]);
    sendMessage(conv.id, t, files);
  };

  const onPick = async (list: FileList | null) => {
    if (!list?.length) return;
    const arr = Array.from(list);
    setUploading((u) => u + arr.length);
    for (const f of arr) {
      const { attachment, error } = await uploadAttachment(f);
      if (attachment) setFiles((prev) => [...prev, attachment]);
      else toast.error(error || `"${f.name}" yuklanmadi`);
      setUploading((u) => u - 1);
    }
  };

  const canDelete = (senderId: string) =>
    senderId === meId ||
    role === "admin" ||
    (meta.isGroup && role === "teacher");

  const typingNames = Object.values(typing ?? {}).map((t) => t.name);
  const busy = !text.trim() && files.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sarlavha */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-elevated md:hidden"
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {meta.isGroup ? (
          <Monogram label={meta.groupSubject ?? "•"} size="sm" />
        ) : meta.other ? (
          <Avatar user={meta.other} size="sm" />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {meta.title}
          </p>
          <p className="truncate text-[11px] text-faint">
            {typingNames.length > 0
              ? `${typingNames.join(", ")} yozmoqda…`
              : meta.subtitle}
          </p>
        </div>
      </div>

      {/* Xabarlar */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {hasMore && (
          <div className="mb-3 text-center">
            <button
              onClick={() => loadOlder(conv.id)}
              disabled={loading}
              className="rounded-full border border-border bg-elevated px-3 py-1 text-xs text-muted hover:text-ink disabled:opacity-50"
            >
              {loading ? "Yuklanmoqda..." : "Oldingi xabarlar"}
            </button>
          </div>
        )}
        {!messages ? (
          <div className="py-10 text-center text-sm text-muted">
            Yuklanmoqda...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted">
            Hali xabar yo'q. Birinchi bo'lib yozing 👋
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m, i) => {
              const mine = m.senderId === meId;
              const sender = userById.get(m.senderId);
              const prev = messages[i - 1];
              const showName =
                meta.isGroup && !mine && (!prev || prev.senderId !== m.senderId);
              const deletable = canDelete(m.senderId);
              return (
                <div
                  key={m.id}
                  className={cn(
                    "group flex items-end gap-1.5",
                    mine ? "justify-end" : "justify-start"
                  )}
                >
                  {mine && deletable && (
                    <DeleteButton onClick={() => setPendingDelete(m.id)} />
                  )}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                      mine
                        ? "rounded-br-md bg-accent text-accent-ink"
                        : "rounded-bl-md bg-elevated text-ink"
                    )}
                  >
                    {showName && (
                      <p className="mb-0.5 text-[11px] font-semibold text-accent">
                        {sender?.name ?? "—"}
                      </p>
                    )}
                    {m.attachments.length > 0 && (
                      <div className="mb-1 space-y-1.5">
                        {m.attachments.map((a) =>
                          a.kind === "image" && a.url ? (
                            <a
                              key={a.id}
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={a.url}
                                alt={a.name}
                                className="max-h-64 w-full rounded-lg object-cover"
                              />
                            </a>
                          ) : (
                            <AttachmentChip
                              key={a.id}
                              attachment={a}
                              className="bg-surface/90"
                            />
                          )
                        )}
                      </div>
                    )}
                    {m.body && (
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    )}
                    <p
                      className={cn(
                        "mt-0.5 text-right text-[10px]",
                        mine ? "text-accent-ink/70" : "text-faint"
                      )}
                    >
                      {clock(m.createdAt)}
                    </p>
                  </div>
                  {!mine && deletable && (
                    <DeleteButton onClick={() => setPendingDelete(m.id)} />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {typingNames.length > 0 && (
          <p className="mt-2 px-1 text-xs italic text-faint">
            {typingNames.join(", ")} yozmoqda…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Tanlangan fayllar */}
      {(files.length > 0 || uploading > 0) && (
        <div className="flex flex-wrap gap-2 border-t border-border px-3 pt-3">
          {files.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs"
            >
              {a.kind === "image" && a.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url}
                  alt={a.name}
                  className="h-7 w-7 rounded object-cover"
                />
              ) : (
                <Paperclip className="h-3.5 w-3.5 text-faint" />
              )}
              <span className="max-w-[120px] truncate text-ink">{a.name}</span>
              <button
                onClick={() =>
                  setFiles((prev) => prev.filter((x) => x.id !== a.id))
                }
                aria-label="O'chirish"
                className="text-faint hover:text-danger"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {uploading > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-2 py-1.5 text-xs text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Yuklanmoqda…
            </div>
          )}
        </div>
      )}

      {/* Yozish */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            aria-label="Fayl biriktirish"
            title="Fayl biriktirish"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-muted transition-colors hover:bg-elevated hover:text-accent"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              onPick(e.target.files);
              e.target.value = "";
            }}
          />
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              emitTyping(conv.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Xabar yozing..."
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-elevated/50 px-3.5 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-accent/50"
          />
          <button
            onClick={send}
            disabled={busy}
            aria-label="Yuborish"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink transition-opacity disabled:opacity-40"
          >
            <Send className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMessage(conv.id, pendingDelete);
        }}
        title="Xabarni o'chirish"
        body="Bu xabar butunlay o'chiriladi. Davom etilsinmi?"
        confirmLabel="O'chirish"
        busyLabel="O'chirilmoqda…"
      />
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Xabarni o'chirish"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

// ======================= Yangi suhbat =======================

function NewChatModal({
  open,
  onClose,
  role,
  me,
}: {
  open: boolean;
  onClose: () => void;
  role: Role;
  me: User;
}) {
  const users = useData((s) => s.users);
  const groups = useData((s) => s.groups);
  const startDirect = useChat((s) => s.startDirect);
  const setActive = useChat((s) => s.setActive);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const targets = useMemo(() => {
    const set = new Set<string>();
    if (role === "admin") {
      users.forEach((u) => u.id !== me.id && set.add(u.id));
    } else {
      // o'z guruhlarimdagi barcha a'zolar (o'qituvchi + barcha o'quvchilar)
      const mine = groupsForUser(groups, me.id, role);
      mine.forEach((g) => {
        set.add(g.teacherId);
        g.studentIds.forEach((s) => set.add(s));
      });
      // adminlar bilan ham yozishish mumkin
      users.forEach((u) => u.role === "admin" && set.add(u.id));
    }
    set.delete(me.id);
    const list = users.filter((u) => set.has(u.id));
    const ql = q.trim().toLowerCase();
    return (ql ? list.filter((u) => u.name.toLowerCase().includes(ql)) : list).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [users, groups, role, me.id, q]);

  const pick = async (userId: string) => {
    setBusy(userId);
    const convId = await startDirect(userId);
    setBusy(null);
    if (convId) {
      setActive(convId);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Yangi suhbat">
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-elevated/50 px-3 py-2">
          <Search className="h-4 w-4 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism bo'yicha qidirish..."
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            autoFocus
          />
        </div>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {targets.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Hech kim yo'q"
              description="Yozish mumkin bo'lgan foydalanuvchilar topilmadi."
            />
          ) : (
            targets.map((u) => (
              <button
                key={u.id}
                onClick={() => pick(u.id)}
                disabled={busy === u.id}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-elevated disabled:opacity-50"
              >
                <Avatar user={u} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {u.name}
                  </p>
                  <p className="truncate text-xs text-faint">
                    {u.role === "teacher"
                      ? "O'qituvchi"
                      : u.role === "admin"
                      ? "Administrator"
                      : "O'quvchi"}
                  </p>
                </div>
                {busy === u.id && (
                  <span className="text-xs text-muted">...</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
