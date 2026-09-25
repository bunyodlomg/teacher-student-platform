"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TestBuilderModal } from "@/components/teacher/TestBuilderModal";
import { toast } from "@/store/toast";
import { attemptsForTest, getGroup } from "@/lib/selectors";
import { bestAttemptRows } from "@/lib/dedupe";
import {
  buildExportRows,
  downloadAllPerClassFiles,
  downloadAllTestResults,
  downloadPerClassFiles,
  downloadTestResults,
  TestExportBundle,
} from "@/lib/testExport";
import { useData } from "@/store/data";
import { Test, TestAttempt } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Clock,
  Download,
  FileCheck2,
  Globe,
  ListChecks,
  Lock,
  Play,
  Plus,
  Sheet,
  Filter,
  FolderArchive,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const statusMeta: Record<
  Test["status"],
  { label: string; tone: "neutral" | "success" | "warning" }
> = {
  draft: { label: "Qoralama", tone: "neutral" },
  open: { label: "Ochiq", tone: "success" },
  closed: { label: "Yopiq", tone: "warning" },
};

/** Test ro'yxati — o'qituvchi va admin sahifalari uchun umumiy. */
export function TestsList({
  tests,
  basePath,
}: {
  tests: Test[];
  basePath: string;
}) {
  const groups = useData((s) => s.groups);
  const attempts = useData((s) => s.attempts);
  const users = useData((s) => s.users);
  const setTestStatus = useData((s) => s.setTestStatus);
  const deleteTest = useData((s) => s.deleteTest);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Test | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  // takroriy urinishlar: har o'quvchidan faqat eng yaxshi natija
  const [bestOnly, setBestOnly] = useState(true);

  /**
   * Natijalarni serverdan oladi — vaqti tugagan urinishlar shu so'rovda
   * yakunlanadi. Tarmoq xato bersa store'dagi nusxaga qaytamiz.
   */
  const loadAttempts = async (testId: string): Promise<TestAttempt[]> => {
    try {
      const res = await fetch(`/api/tests/${testId}/attempts`, {
        credentials: "include",
      });
      if (res.ok) {
        const d = await res.json();
        if (Array.isArray(d?.attempts)) return d.attempts as TestAttempt[];
      }
    } catch {
      /* offline — pastdagi zaxira ishlatiladi */
    }
    return attemptsForTest(attempts, testId);
  };

  const bundleFor = async (t: Test): Promise<TestExportBundle> => {
    const all = buildExportRows(await loadAttempts(t.id), users);
    return {
      test: t,
      groupName: getGroup(groups, t.groupId)?.name,
      rows: bestOnly ? bestAttemptRows(all).rows : all,
    };
  };

  /**
   * Bitta test — natijalar sahifasiga kirmasdan yuklab olish.
   * mode="one" → bitta fayl (sinflar varaq-varaq),
   * mode="split" → har sinf alohida fayl (ZIP arxiv).
   */
  const exportOne = async (t: Test, mode: "one" | "split") => {
    setExporting(t.id + mode);
    try {
      const bundle = await bundleFor(t);
      if (bundle.rows.length === 0) {
        toast.error("Bu testda hali natija yo'q");
        return;
      }
      if (mode === "split") {
        const n = await downloadPerClassFiles(bundle);
        toast.success(
          n === 1 ? "Excel tayyor" : `${n} ta sinf — ${n} ta fayl (ZIP)`
        );
      } else {
        await downloadTestResults(bundle);
        toast.success("Excel tayyor — sinflar bo'yicha alohida varaqlar");
      }
    } catch {
      toast.error("Yuklab bo'lmadi");
    } finally {
      setExporting(null);
    }
  };

  /** Barcha testlarni bir yo'la yig'ib olish. */
  const exportAll = async (mode: "one" | "split") => {
    setExporting("all" + mode);
    try {
      const bundles: TestExportBundle[] = [];
      // serverni bosmaslik uchun 4 tadan
      for (let i = 0; i < tests.length; i += 4) {
        const chunk = await Promise.all(tests.slice(i, i + 4).map(bundleFor));
        bundles.push(...chunk);
      }
      const withRows = bundles.filter((b) => b.rows.length > 0);
      if (withRows.length === 0) {
        toast.error("Hali birorta testda natija yo'q");
        return;
      }
      if (mode === "split") {
        const n = await downloadAllPerClassFiles(withRows);
        toast.success(`${withRows.length} ta test · ${n} ta sinf fayli (ZIP)`);
      } else {
        await downloadAllTestResults(withRows);
        toast.success(`${withRows.length} ta test natijasi yuklandi`);
      }
    } catch {
      toast.error("Yuklab bo'lmadi");
    } finally {
      setExporting(null);
    }
  };

  const toggle = async (t: Test) => {
    const opening = t.status !== "open";
    setBusy(t.id);
    const res = await setTestStatus(t.id, opening ? "open" : "closed");
    setBusy(null);
    if (res.ok)
      toast.success(
        opening ? "Test ochildi — o'quvchilar ishlashi mumkin" : "Test yopildi"
      );
    else toast.error(res.error || "Xatolik yuz berdi");
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(toDelete.id);
    const res = await deleteTest(toDelete.id);
    setBusy(null);
    if (res.ok) toast.success("Test o'chirildi");
    else toast.error(res.error || "O'chirishda xatolik");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Online DTM"
        title="Testlar"
        subtitle="Test yarating, import qiling va o'quvchilarga ruxsat bering. Natijalar avtomatik saqlanadi."
        action={
          <div className="flex items-center gap-2">
            {tests.length > 0 && (
              <>
                <button
                  onClick={() => setBestOnly((v) => !v)}
                  disabled={!!exporting}
                  title="Bir o'quvchi bir necha marta ishlagan bo'lsa, eksportga faqat eng yaxshi natijasi tushadi"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                    bestOnly
                      ? "border-accent/30 bg-accent-soft text-accent"
                      : "border-border text-muted hover:text-ink"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  {bestOnly ? "Eng yaxshi natija" : "Barcha urinishlar"}
                </button>
                <Button
                  variant="secondary"
                  onClick={() => exportAll("one")}
                  disabled={!!exporting}
                  title="Barcha testlar — bitta Excel faylda (har sinf alohida varaq)"
                >
                  <Sheet className="h-4 w-4" />
                  {exporting === "allone" ? "Tayyorlanmoqda…" : "Hammasi — Excel"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => exportAll("split")}
                  disabled={!!exporting}
                  title="Barcha testlar — har sinf alohida fayl, ZIP arxivda"
                >
                  <FolderArchive className="h-4 w-4" />
                  {exporting === "allsplit"
                    ? "Tayyorlanmoqda…"
                    : "Hammasi — sinf fayllari"}
                </Button>
              </>
            )}
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Yangi test
            </Button>
          </div>
        }
      />

      {tests.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="Hali test yo'q"
          description="Birinchi testingizni yarating yoki Excel/CSV'dan import qiling."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Yangi test
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {tests.map((t, i) => {
            const group = getGroup(groups, t.groupId);
            const list = attemptsForTest(attempts, t.id);
            const done = list.filter((a) => a.status !== "in_progress");
            const avg =
              done.length && t.totalPoints
                ? Math.round(
                    (done.reduce((s, a) => s + a.score, 0) /
                      (done.length * t.totalPoints)) *
                      100
                  )
                : null;
            const sm = statusMeta[t.status];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-accent/30"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Badge tone={sm.tone} dot>
                        {sm.label}
                      </Badge>
                      {t.isPublic && (
                        <Badge tone="accent">
                          <Globe className="h-3.5 w-3.5" /> Loginsiz
                        </Badge>
                      )}
                      {group && (
                        <span className="text-[12px] text-faint">
                          {group.name}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`${basePath}/tests/${t.id}`}
                      className="font-display text-[17px] font-semibold text-ink transition-colors hover:text-accent"
                    >
                      {t.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
                      <span className="flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5 text-faint" />
                        {t.questionCount} savol · {t.totalPoints} ball
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-faint" />
                        {t.durationMin} daqiqa
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-faint" />
                        {done.length} topshirgan
                      </span>
                      {avg !== null && (
                        <span className="font-medium text-accent">
                          o'rtacha {avg}%
                        </span>
                      )}
                      <span className="text-faint">
                        {relativeTime(t.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={t.status === "open" ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => toggle(t)}
                      disabled={busy === t.id}
                    >
                      {t.status === "open" ? (
                        <>
                          <Lock className="h-4 w-4" /> Yopish
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          {t.status === "closed" ? "Qayta ochish" : "Ruxsat berish"}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportOne(t, "one")}
                      disabled={!!exporting}
                      title="Bitta Excel fayl — har sinf alohida varaqda"
                    >
                      <Download className="h-4 w-4" />
                      {exporting === t.id + "one" ? "…" : "Excel"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => exportOne(t, "split")}
                      disabled={!!exporting}
                      title="Har sinf uchun alohida fayl (ZIP arxiv)"
                    >
                      <FolderArchive className="h-4 w-4" />
                      {exporting === t.id + "split" ? "…" : "Sinflar"}
                    </Button>
                    <Link href={`${basePath}/tests/${t.id}`}>
                      <Button variant="secondary" size="sm">
                        Natijalar
                      </Button>
                    </Link>
                    <button
                      onClick={() => setToDelete(t)}
                      disabled={busy === t.id}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-lg text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                      )}
                      title="O'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <TestBuilderModal open={open} onClose={() => setOpen(false)} />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="Testni o'chirish"
        description="Bu testni va unga tegishli barcha natijalarni butunlay o'chiradi. Buni qaytarib bo'lmaydi."
        body={
          toDelete ? (
            <>
              <span className="font-medium text-ink">“{toDelete.title}”</span>{" "}
              testini o'chirishni tasdiqlaysizmi?
            </>
          ) : null
        }
        confirmLabel="O'chirish"
        busyLabel="O'chirilmoqda…"
      />
    </div>
  );
}
