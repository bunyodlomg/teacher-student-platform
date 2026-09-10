"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Group, MaterialGuest } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { useData } from "@/store/data";
import { toast } from "@/store/toast";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Copy,
  Download,
  Globe,
  Loader2,
  Monitor,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/**
 * Guruh materiallarini loginsiz ulashish paneli — havola + kirish jurnali.
 *
 * Jurnal mehmonlarni "Kompyuter-N" yorlig'i va ismi bilan ko'rsatadi, shu
 * sabab ochiq ulashish hech qachon to'liq anonim bo'lmaydi.
 */
export function PublicMaterialsCard({ group }: { group: Group }) {
  const updateGroup = useData((s) => s.updateGroup);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openLog, setOpenLog] = useState(false);
  const [guests, setGuests] = useState<MaterialGuest[] | null>(null);

  const isOpen = !!group.materialsPublic;
  const link =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/m/g/${group.id}`;

  const loadGuests = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${group.id}/guests`, {
        credentials: "include",
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setGuests(d.guests ?? []);
    } catch {
      /* jurnal ikkinchi darajali — xato ko'rsatilmaydi */
    }
  }, [group.id]);

  useEffect(() => {
    void loadGuests();
  }, [loadGuests]);

  const toggle = async () => {
    setBusy(true);
    const r = await updateGroup(group.id, { materialsPublic: !isOpen });
    setBusy(false);
    if (!r.ok) return toast.error(r.error || "Saqlanmadi");
    toast.success(
      isOpen ? "Ochiq ulashish to'xtatildi" : "Materiallar ochiq ulashildi"
    );
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Nusxalab bo'lmadi");
    }
  };

  const guestCount = guests?.length ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
          <Globe className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">Ochiq materiallar</p>
            {isOpen && (
              <Badge tone="accent">
                <Globe className="h-3 w-3" /> Loginsiz
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
            {isOpen
              ? "Havolani bilgan har kim ism kiritib fayllarni yuklab oladi."
              : "Yoqilsa, guruhdagi fayl biriktirilgan darslar loginsiz ochiladi."}
          </p>
        </div>
        <Button
          variant={isOpen ? "secondary" : "primary"}
          size="sm"
          onClick={toggle}
          disabled={busy}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {isOpen ? "To'xtatish" : "Ulashish"}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-accent/25 bg-accent-soft/40 px-3 py-2">
          <p className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted">
            {link}
          </p>
          <Button variant="ghost" size="sm" onClick={copy}>
            <Copy className="h-4 w-4" /> {copied ? "Nusxalandi" : "Nusxalash"}
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpenLog((v) => !v)}
        className="mt-3 flex w-full items-center gap-2 rounded-xl border border-border bg-bg/40 px-3 py-2 text-left transition-colors hover:bg-elevated"
      >
        <Users className="h-4 w-4 shrink-0 text-faint" />
        <span className="flex-1 text-[13px] font-medium text-ink">
          Kirganlar
          <span className="ml-1.5 text-[12px] font-normal text-faint">
            {guests === null ? "…" : `${guestCount} ta qurilma`}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-faint transition-transform ${
            openLog ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {openLog && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {guestCount === 0 && (
                <p className="px-1 py-2 text-[12px] text-faint">
                  Hali hech kim ochmagan.
                </p>
              )}
              {(guests ?? []).map((g) => (
                <GuestRow key={g.id} guest={g} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GuestRow({ guest }: { guest: MaterialGuest }) {
  const [open, setOpen] = useState(false);
  const downloads = guest.events.filter((e) => e.action === "download");

  return (
    <div className="rounded-xl border border-border bg-bg/30 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-elevated text-muted">
          <Monitor className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">
            {guest.name}
            {guest.grade ? ` · ${guest.grade}` : ""}
          </span>
          <span className="block text-[11px] text-faint">
            {guest.label} · {relativeTime(guest.lastSeenAt)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted">
          <Download className="h-3.5 w-3.5" />
          {guest.downloads}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && downloads.length > 0 && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {downloads
              .slice()
              .reverse()
              .map((e, i) => (
                <li
                  key={`${e.at}-${i}`}
                  className="flex items-center gap-2 border-t border-border/60 py-1.5 text-[12px] text-muted"
                >
                  <Download className="h-3.5 w-3.5 shrink-0 text-faint" />
                  <span className="min-w-0 flex-1 truncate">
                    {e.fileName || "fayl"}
                  </span>
                  <span className="shrink-0 text-[11px] text-faint">
                    {relativeTime(e.at)}
                  </span>
                </li>
              ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
