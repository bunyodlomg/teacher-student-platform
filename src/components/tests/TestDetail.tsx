"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { attemptsForTest, getGroup, getTest, getUser } from "@/lib/selectors";
import { useData } from "@/store/data";
import { toast } from "@/store/toast";
import { Test, TestAttempt } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Copy,
  Download,
  Globe,
  Lock,
  Play,
  Send,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function minutesBetween(a?: string, b?: string): string {
  if (!a || !b) return "—";
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (ms <= 0) return "—";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const statusMeta: Record<
  Test["status"],
  { label: string; tone: "neutral" | "success" | "warning" }
> = {
  draft: { label: "Qoralama", tone: "neutral" },
  open: { label: "Ochiq", tone: "success" },
  closed: { label: "Yopiq", tone: "warning" },
};

/** Test natijalari — o'qituvchi va admin uchun umumiy. */
export function TestDetail({
  testId,
  basePath,
}: {
  testId: string;
  basePath: string;
}) {
  const tests = useData((s) => s.tests);
  const groups = useData((s) => s.groups);
  const users = useData((s) => s.users);
  const storeAttempts = useData((s) => s.attempts);
  const setTestStatus = useData((s) => s.setTestStatus);

  const test = getTest(tests, testId);
  const group = test ? getGroup(groups, test.groupId) : undefined;
  const [fresh, setFresh] = useState<TestAttempt[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/tests/${testId}/attempts`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d?.attempts && setFresh(d.attempts))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [testId, storeAttempts.length]);

  const attempts = fresh ?? attemptsForTest(storeAttempts, testId);

  const rows = useMemo(() => {
    return attempts
      .map((a) => {
        const u = getUser(users, a.studentId);
        const name = a.guest?.name ?? u?.name ?? "—";
        const grade = a.guest?.grade ?? "";
        const phone = a.guest?.phone ?? "";
        const pct = a.maxScore ? Math.round((a.score / a.maxScore) * 100) : 0;
        return { a, name, grade, phone, isGuest: !!a.isGuest, pct };
      })
      .sort((x, y) => y.a.score - x.a.score);
  }, [attempts, users]);

  const finished = rows.filter((r) => r.a.status !== "in_progress");
  const avg = finished.length
    ? Math.round(finished.reduce((s, r) => s + r.pct, 0) / finished.length)
    : null;
  const best = finished.length ? Math.max(...finished.map((r) => r.pct)) : null;

  if (!test) {
    return <div className="py-20 text-center text-muted">Test topilmadi.</div>;
  }
  const sm = statusMeta[test.status];

  const publicLink =
    typeof window !== "undefined" ? `${window.location.origin}/t/${test.id}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      toast.success("Havola nusxalandi");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nusxalab bo'lmadi");
    }
  };

  const toggle = async () => {
    const opening = test.status !== "open";
    setBusy(true);
    const res = await setTestStatus(test.id, opening ? "open" : "closed");
    setBusy(false);
    if (res.ok) toast.success(opening ? "Test ochildi" : "Test yopildi");
    else toast.error(res.error || "Xatolik");
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const head = [
      "№",
      "Ism-familiya",
      "Sinf",
      "Telefon",
      "Turi",
      "Guruh",
      "Sana",
      "To'g'ri",
      "Jami",
      "Ball",
      "Maks",
      "Foiz",
      "Vaqt",
      "Qoida buzish",
      "Holat",
    ];
    const body = rows.map((r, i) => [
      i + 1,
      r.name,
      r.grade || "—",
      r.phone || "—",
      r.isGuest ? "Mehmon" : "O'quvchi",
      group?.name ?? "—",
      r.a.submittedAt ? formatDateTime(r.a.submittedAt) : "—",
      r.a.correctCount,
      r.a.totalCount,
      r.a.score,
      r.a.maxScore,
      r.pct / 100,
      minutesBetween(r.a.startedAt, r.a.submittedAt),
      r.a.violations,
      r.a.status === "in_progress"
        ? "Ishlamoqda"
        : r.a.status === "auto_submitted"
        ? "Vaqt tugadi"
        : "Topshirilgan",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws["!cols"] = [
      { wch: 4 },
      { wch: 24 },
      { wch: 8 },
      { wch: 16 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 7 },
      { wch: 6 },
      { wch: 6 },
      { wch: 6 },
      { wch: 8 },
      { wch: 8 },
      { wch: 12 },
      { wch: 14 },
    ];
    // "Foiz" ustuni (L = index 11)
    for (let i = 0; i < body.length; i++) {
      const cell = ws[XLSX.utils.encode_cell({ r: i + 1, c: 11 })];
      if (cell) cell.z = "0%";
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Natijalar");
    const safe = test.title.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
    XLSX.writeFile(wb, `${safe}-natijalar.xlsx`);
  };

  const notifyParents = async () => {
    setNotifying(true);
    try {
      const res = await fetch(`/api/tests/${test.id}/notify`, {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d?.error || "Yuborib bo'lmadi");
        return;
      }
      if (d.sent > 0) {
        toast.success(
          `${d.sent} ta ota-onaga yuborildi` +
            (d.noLink ? ` · ${d.noLink} tasi botga ulanmagan` : "")
        );
      } else if (d.noLink > 0) {
        toast.error(
          `Hech kim botga ulanmagan (${d.noLink} ta ishtirokchi). Ota-onalar botga /start bosib raqamini ulashi kerak.`
        );
      } else if (d.noPhone > 0 && d.matched === 0) {
        toast.error("Ishtirokchilarda telefon raqami yo'q.");
      } else {
        toast.error("Yuborish uchun yakunlangan natija topilmadi.");
      }
    } catch {
      toast.error("Tarmoq xatosi");
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div>
      <Link
        href={`${basePath}/tests`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Barcha testlar
      </Link>

      <PageHeader
        eyebrow={group?.name}
        title={test.title}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={sm.tone} dot>
              {sm.label}
            </Badge>
            {test.isPublic && (
              <Badge tone="accent">
                <Globe className="h-3.5 w-3.5" /> Loginsiz
              </Badge>
            )}
            <Button
              variant={test.status === "open" ? "secondary" : "primary"}
              size="sm"
              onClick={toggle}
              disabled={busy}
            >
              {test.status === "open" ? (
                <>
                  <Lock className="h-4 w-4" /> Yopish
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  {test.status === "closed" ? "Qayta ochish" : "Ruxsat berish"}
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* ochiq test havolasi */}
      {test.isPublic && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/25 bg-accent-soft/40 p-4">
          <Globe className="h-5 w-5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-ink">
              Loginsiz test havolasi
            </p>
            <p className="truncate font-mono text-[12px] text-muted">
              {publicLink}
            </p>
            {test.status !== "open" && (
              <p className="mt-0.5 text-[11px] text-warning">
                Havola faqat test ochiq bo'lganда ishlaydi.
              </p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4" /> {copied ? "Nusxalandi" : "Nusxalash"}
          </Button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Users}
          label="Topshirgan"
          value={finished.length}
          hint={`${test.questionCount} savol`}
        />
        <StatCard
          icon={Award}
          label="O'rtacha"
          value={avg !== null ? `${avg}%` : "—"}
        />
        <StatCard
          icon={Trophy}
          label="Eng yuqori"
          value={best !== null ? `${best}%` : "—"}
        />
        <StatCard
          icon={Timer}
          label="Davomiyligi"
          value={`${test.durationMin} daq`}
        />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">
          Natijalar
        </h2>
        {rows.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={notifyParents}
              disabled={notifying}
              title="Bog'langan ota-onalarga natijani Telegram orqali yuborish"
            >
              <Send className="h-4 w-4" />
              {notifying ? "Yuborilmoqda…" : "Ota-onaga yuborish"}
            </Button>
            <Button variant="secondary" size="sm" onClick={exportExcel}>
              <Download className="h-4 w-4" /> Excel yuklab olish
            </Button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Hali natija yo'q"
          description={
            test.status === "open"
              ? "O'quvchilar testni ishlaganda natijalar shu yerda paydo bo'ladi."
              : "Testni oching va o'quvchilarga ruxsat bering."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[12px] uppercase tracking-wide text-faint">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Ishtirokchi</th>
                <th className="px-4 py-3 font-medium">Sinf</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="px-4 py-3 font-medium">Sana</th>
                <th className="px-4 py-3 text-center font-medium">To'g'ri</th>
                <th className="px-4 py-3 text-center font-medium">Ball</th>
                <th className="px-4 py-3 text-center font-medium">Foiz</th>
                <th className="px-4 py-3 text-center font-medium">Vaqt</th>
                <th className="px-4 py-3 text-center font-medium">Nazorat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const inProgress = r.a.status === "in_progress";
                return (
                  <tr
                    key={r.a.id}
                    className="border-b border-border/60 last:border-0 hover:bg-elevated/40"
                  >
                    <td className="px-4 py-3 text-faint">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-ink">
                      <span className="flex items-center gap-1.5">
                        {r.name}
                        {r.isGuest && (
                          <span
                            title="Loginsiz (mehmon)"
                            className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent"
                          >
                            mehmon
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted">
                      {r.grade || "—"}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted">
                      {r.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted">
                      {r.a.submittedAt
                        ? formatDateTime(r.a.submittedAt)
                        : inProgress
                        ? "ishlamoqda…"
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-muted nums">
                      {r.a.correctCount}/{r.a.totalCount}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-ink nums">
                      {r.a.score}
                      <span className="text-faint">/{r.a.maxScore}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold",
                          r.pct >= 60
                            ? "bg-success/10 text-success"
                            : r.pct >= 40
                            ? "bg-warning/12 text-warning"
                            : "bg-danger/10 text-danger"
                        )}
                      >
                        {inProgress ? "—" : `${r.pct}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[13px] text-muted nums">
                      {minutesBetween(r.a.startedAt, r.a.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.a.violations > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-danger"
                          title="Fokus yo'qolishi / tab almashish"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {r.a.violations}
                        </span>
                      ) : (
                        <span className="text-[12px] text-success">toza</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
