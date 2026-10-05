"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/motion";
import { toast } from "@/store/toast";
import { attemptsForTest, getGroup } from "@/lib/selectors";
import { buildExportRows, downloadStipendList } from "@/lib/testExport";
import type { TestExportBundle } from "@/lib/testExport";
import {
  buildStipendStandings,
  COUNTED_SUBJECTS,
  MIN_TOTAL,
  type ClassStanding,
  type StipendEntry,
} from "@/lib/stipend";
import { useData } from "@/store/data";
import { Test, TestAttempt } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronDown,
  Medal,
  RefreshCw,
  Sheet,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const MAX_TOTAL = COUNTED_SUBJECTS * 100;

/**
 * Stipendiya reytingi — har sinfdan eng kuchli bitta o'quvchi.
 * Hisob: har fandan eng yuqori natija → eng kuchli 2 fan foizi yig'indisi.
 */
export function StipendBoard({
  tests,
  basePath,
}: {
  tests: Test[];
  basePath: string;
}) {
  const groups = useData((s) => s.groups);
  const users = useData((s) => s.users);
  const storeAttempts = useData((s) => s.attempts);

  const [standings, setStandings] = useState<ClassStanding[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [openGrade, setOpenGrade] = useState<string | null>(null);

  /** Barcha testlar natijasini serverdan yig'adi (4 tadan — serverni bosmaslik uchun). */
  const load = useCallback(async () => {
    setLoading(true);
    const bundleFor = async (t: Test): Promise<TestExportBundle> => {
      let attempts: TestAttempt[] = attemptsForTest(storeAttempts, t.id);
      try {
        const res = await fetch(`/api/tests/${t.id}/attempts`, {
          credentials: "include",
        });
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d?.attempts)) attempts = d.attempts as TestAttempt[];
        }
      } catch {
        /* offline — store'dagi nusxa ishlatiladi */
      }
      // XOM qatorlar: qayta topshirishlar fan kesimida birlashtiriladi
      return {
        test: t,
        groupName: getGroup(groups, t.groupId)?.name,
        rows: buildExportRows(attempts, users),
      };
    };

    const bundles: TestExportBundle[] = [];
    for (let i = 0; i < tests.length; i += 4) {
      const chunk = await Promise.all(tests.slice(i, i + 4).map(bundleFor));
      bundles.push(...chunk);
    }
    setStandings(buildStipendStandings(bundles));
    setLoading(false);
  }, [tests, groups, users, storeAttempts]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tests.length]);

  const exportExcel = async () => {
    if (!standings?.length) return;
    setExporting(true);
    try {
      await downloadStipendList(standings);
      toast.success(`${standings.length} ta sinf g'olibi yuklandi`);
    } catch {
      toast.error("Yuklab bo'lmadi");
    } finally {
      setExporting(false);
    }
  };

  const totalEntries = standings?.reduce((s, c) => s + c.entries.length, 0) ?? 0;
  const withWinner = standings?.filter((s) => s.winner).length ?? 0;

  return (
    <div>
      <Link
        href={`${basePath}/tests`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" /> Testlarga qaytish
      </Link>

      <PageHeader
        eyebrow="Rag'bat"
        title="Stipendiya — sinf g'oliblari"
        gradient
        subtitle={`Har o'quvchining har fandan eng yuqori natijasi olinadi, so'ng eng kuchli ${COUNTED_SUBJECTS} fan foizi qo'shiladi (maks ${MAX_TOTAL}). Sinfdagi eng yuqori ball — stipendiyaga nomzod. ${MIN_TOTAL} balldan past to'plaganlar munosib emas.`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => void load()}
              disabled={loading || exporting}
              title="Natijalarni serverdan qayta yig'ish"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Yangilash
            </Button>
            <Button
              variant="glow"
              onClick={exportExcel}
              disabled={loading || exporting || !standings?.length}
            >
              <Sheet className="h-4 w-4" />
              {exporting ? "Tayyorlanmoqda…" : "Excel"}
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : !standings?.length ? (
        <EmptyState
          icon={Trophy}
          title="Reyting uchun natija yo'q"
          description="O'quvchilar testlarni topshirgach, sinf kesimidagi g'oliblar shu yerda paydo bo'ladi."
          action={
            <Link href={`${basePath}/tests`}>
              <Button variant="secondary">Testlarga o'tish</Button>
            </Link>
          }
        />
      ) : (
        <>
          <p className="mb-4 text-[13px] text-muted">
            <span className="font-semibold text-ink">{standings.length}</span> ta
            sinf · <span className="font-semibold text-ink">{totalEntries}</span>{" "}
            ta ishtirokchi ·{" "}
            <span className="font-semibold text-accent">{withWinner}</span> ta
            sinfda munosib g'olib aniqlandi
          </p>

          <div className="grid gap-3">
            {standings.map((s) => (
              <ClassCard
                key={s.grade}
                standing={s}
                open={openGrade === s.grade}
                onToggle={() =>
                  setOpenGrade((g) => (g === s.grade ? null : s.grade))
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Bitta sinf — g'olib katta ko'rsatiladi, qolganlari ochiladigan ro'yxatda. */
function ClassCard({
  standing,
  open,
  onToggle,
}: {
  standing: ClassStanding;
  open: boolean;
  onToggle: () => void;
}) {
  const { grade, winner, entries } = standing;
  // g'olib bo'lsa u yuqorida ko'rsatiladi, ro'yxatda qolganlari qoladi
  const rest = winner ? entries.slice(1) : entries;

  return (
    <GlassCard
      className="overflow-hidden rounded-2xl border border-border p-0"
      glow={!!winner}
    >
      <div className="flex flex-wrap items-center gap-4 p-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            winner
              ? "bg-accent-gradient text-white shadow-glow-accent"
              : "bg-elevated text-faint"
          )}
        >
          <Trophy className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{grade}</Badge>
            {winner?.isGuest && <Badge tone="neutral">mehmon</Badge>}
            {/* 1 fan ishlagan o'quvchi ham sinfda birinchi bo'lib qolishi mumkin —
                admin buni ko'rib turishi uchun ogohlantiramiz */}
            {winner && winner.counted.length < COUNTED_SUBJECTS && (
              <Badge tone="warning">faqat {winner.counted.length} fan</Badge>
            )}
          </div>

          {winner ? (
            <>
              <p className="font-display text-[18px] font-semibold text-ink">
                {winner.name}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                {winner.counted.map((c) => (
                  <span key={c.subject} className="flex items-center gap-1">
                    <span className="text-faint">{c.subject}</span>
                    <span className="nums font-semibold text-ink">
                      {c.pct}%
                    </span>
                    {c.tries > 1 && (
                      <span
                        className="text-faint"
                        title={`${c.tries} ta urinishdan eng yaxshisi`}
                      >
                        ({c.tries}×)
                      </span>
                    )}
                  </span>
                ))}
                {winner.phone && (
                  <span className="text-faint">{winner.phone}</span>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="font-display text-[18px] font-semibold text-muted">
                Munosib nomzod yo'q
              </p>
              <p className="mt-1.5 text-[12px] text-faint">
                Sinfdagi eng yuqori natija{" "}
                <span className="nums font-semibold text-muted">
                  {entries[0]?.total ?? 0}
                </span>{" "}
                ball — {MIN_TOTAL} ball chegarasidan past
              </p>
            </>
          )}
        </div>

        {winner && (
          <div className="text-right">
            <p className="nums font-display text-[26px] font-semibold leading-none text-gradient">
              {winner.total}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-faint">
              {MAX_TOTAL} dan
            </p>
          </div>
        )}

        {rest.length > 0 && (
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-muted transition-colors hover:bg-elevated hover:text-ink"
            title="Sinfdagi qolgan ishtirokchilar"
          >
            <Users className="h-3.5 w-3.5" />
            {winner ? `yana ${rest.length}` : `${rest.length} ishtirokchi`}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        )}
      </div>

      {open && rest.length > 0 && (
        <div className="border-t border-border/60 bg-elevated/30">
          {rest.map((e, i) => (
            <RunnerUp
              key={`${e.name}-${i}`}
              entry={e}
              rank={winner ? i + 2 : i + 1}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

/** G'olibdan keyingi o'rinlar — ixcham qator. */
function RunnerUp({ entry, rank }: { entry: StipendEntry; rank: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border/40 px-4 py-2.5 last:border-0">
      <span className="nums w-6 shrink-0 text-center text-[12px] font-semibold text-faint">
        {rank}
      </span>
      {rank <= 3 && entry.eligible && (
        <Medal className="h-3.5 w-3.5 text-warning" />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[14px] font-medium",
          entry.eligible ? "text-ink" : "text-muted"
        )}
      >
        {entry.name}
      </span>
      {!entry.eligible && (
        <span
          className="text-[11px] text-faint"
          title={`${MIN_TOTAL} balldan past — stipendiyaga munosib emas`}
        >
          munosib emas
        </span>
      )}
      <span className="flex flex-wrap items-center gap-x-2.5 text-[12px] text-muted">
        {entry.counted.map((c) => (
          <span key={c.subject}>
            <span className="text-faint">{c.subject}</span>{" "}
            <span className="nums font-semibold text-ink">{c.pct}%</span>
          </span>
        ))}
      </span>
      <span
        className={cn(
          "nums w-14 text-right font-semibold",
          entry.eligible ? "text-ink" : "text-faint"
        )}
      >
        {entry.total}
      </span>
    </div>
  );
}
