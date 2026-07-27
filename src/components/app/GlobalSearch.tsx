"use client";

import { cn } from "@/lib/utils";
import { htmlToText } from "@/lib/sanitize";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ClipboardCheck,
  LayoutGrid,
  Search,
  User as UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserModal } from "./UserModal";
import { User } from "@/lib/types";

const typeLabel: Record<string, string> = {
  lesson: "Dars",
  announcement: "E'lon",
  assignment: "Topshiriq",
};

export function GlobalSearch() {
  const router = useRouter();
  const role = useSession((s) => s.role);
  const posts = useData((s) => s.posts);
  const assignments = useData((s) => s.assignments);
  const groups = useData((s) => s.groups);
  const users = useData((s) => s.users);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [person, setPerson] = useState<User | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const base = role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 1) return null;
    const has = (s?: string) => (s ?? "").toLowerCase().includes(t);
    return {
      lessons: posts
        .filter((p) => has(p.title) || has(htmlToText(p.body)))
        .slice(0, 5),
      asg: assignments
        .filter((a) => has(a.title) || has(a.description))
        .slice(0, 5),
      grp: groups.filter((g) => has(g.name) || has(g.subject)).slice(0, 4),
      ppl: users.filter((u) => has(u.name) || has(u.email)).slice(0, 4),
    };
  }, [q, posts, assignments, groups, users]);

  const total = results
    ? results.lessons.length +
      results.asg.length +
      results.grp.length +
      results.ppl.length
    : 0;

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const groupHref = (groupId: string) =>
    role === "admin" ? "/admin/groups" : `${base}/groups/${groupId}`;
  // open a specific post inside its group feed (scroll + highlight there)
  const postHref = (groupId: string, postId: string) =>
    role === "admin"
      ? "/admin/groups"
      : `${base}/groups/${groupId}?post=${postId}`;

  const openPerson = (u: User) => {
    setOpen(false);
    setQ("");
    setPerson(u);
  };

  return (
    <div ref={ref} className="relative hidden max-w-md flex-1 sm:block">
      <div className="group relative flex items-center">
        <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-faint transition-colors group-focus-within:text-accent" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Darslar, topshiriqlar, odamlarni qidiring…"
          className="h-10 w-full rounded-xl border border-border bg-bg/60 pl-10 pr-4 text-sm text-ink placeholder:text-faint focus:border-accent/40 focus:bg-surface focus:outline-none focus:ring-4 focus:ring-accent/10"
        />
      </div>

      <AnimatePresence>
        {open && results && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-lift"
          >
            {total === 0 && (
              <p className="px-3 py-6 text-center text-[13px] text-muted">
                “{q}” bo'yicha hech narsa topilmadi.
              </p>
            )}

            <Section show={results.lessons.length > 0} title="Darslar / postlar">
              {results.lessons.map((p) => (
                <Row
                  key={p.id}
                  icon={<BookOpen className="h-4 w-4" />}
                  title={p.title}
                  meta={typeLabel[p.type]}
                  onClick={() => go(postHref(p.groupId, p.id))}
                />
              ))}
            </Section>

            <Section show={results.asg.length > 0} title="Topshiriqlar">
              {results.asg.map((a) => (
                <Row
                  key={a.id}
                  icon={<ClipboardCheck className="h-4 w-4" />}
                  title={a.title}
                  meta={`${a.points} ball`}
                  onClick={() =>
                    go(
                      role === "student"
                        ? `/student/assignments/${a.id}`
                        : `${base}/review`
                    )
                  }
                />
              ))}
            </Section>

            <Section show={results.grp.length > 0} title="Guruhlar">
              {results.grp.map((g) => (
                <Row
                  key={g.id}
                  icon={<LayoutGrid className="h-4 w-4" />}
                  title={g.name}
                  meta={g.subject}
                  onClick={() => go(groupHref(g.id))}
                />
              ))}
            </Section>

            <Section show={results.ppl.length > 0} title="Odamlar">
              {results.ppl.map((u) => (
                <Row
                  key={u.id}
                  icon={<UserIcon className="h-4 w-4" />}
                  title={u.name}
                  meta={`@${u.email}`}
                  onClick={() => openPerson(u)}
                />
              ))}
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      <UserModal
        user={person}
        open={!!person}
        onClose={() => setPerson(null)}
      />
    </div>
  );
}

function Section({
  show,
  title,
  children,
}: {
  show: boolean;
  title: string;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <div className="mb-1">
      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({
  icon,
  title,
  meta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-elevated"
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">
          {title}
        </span>
        {meta && (
          <span className="block truncate text-[11px] text-faint">{meta}</span>
        )}
      </span>
    </button>
  );
}
