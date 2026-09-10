"use client";

import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AttachmentChip } from "@/components/ui/Attachment";
import { Aurora } from "@/components/motion";
import { PublicMaterial } from "@/lib/types";
import { RichContent } from "@/lib/richtext";
import { getDeviceId, loadGuestSession, saveGuestSession } from "@/lib/device";
import { formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Download,
  FolderOpen,
  Loader2,
  Monitor,
  ShieldCheck,
  Unlock,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface Meta {
  scope: "g" | "p";
  id: string;
  title: string;
  groupName: string;
  subject: string;
  emoji: string;
  description: string;
  teacherName: string;
  lessonCount: number;
  fileCount: number;
}

/**
 * Loginsiz material sahifasi — `/m/g/<guruh>` yoki `/m/p/<dars>`.
 *
 * Fayllar faqat ism kiritilgandan keyin ochiladi: server qurilmaga
 * "Kompyuter-N" yorlig'ini biriktiradi va har bir yuklab olish jurnalga
 * yoziladi, shu sabab kirish anonim bo'lmaydi.
 */
export default function PublicMaterialsPage() {
  const params = useParams();
  const scope = params.scope as string;
  const id = params.id as string;

  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [entering, setEntering] = useState(false);
  const [enterErr, setEnterErr] = useState("");

  const [materials, setMaterials] = useState<PublicMaterial[] | null>(null);
  const [label, setLabel] = useState("");
  const [who, setWho] = useState("");
  const tokenRef = useRef("");

  const enter = useCallback(
    async (guestName: string, guestGrade: string) => {
      setEntering(true);
      setEnterErr("");
      try {
        const res = await fetch(`/api/public/materials/${scope}/${id}/enter`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: getDeviceId(),
            name: guestName,
            grade: guestGrade,
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.ok && d.materials) {
          tokenRef.current = d.token;
          setLabel(d.guest?.label ?? "");
          setWho(d.guest?.name ?? guestName);
          setMaterials(d.materials);
          saveGuestSession(scope, id, {
            name: guestName,
            grade: guestGrade,
            label: d.guest?.label ?? "",
            token: d.token,
          });
        } else {
          setEnterErr(d?.error || "Ochib bo'lmadi");
        }
      } catch {
        setEnterErr("Tarmoq xatosi");
      } finally {
        setEntering(false);
      }
    },
    [scope, id]
  );

  // meta yuklanadi; qurilma avval kirgan bo'lsa qayta so'ralmaydi
  useEffect(() => {
    let alive = true;
    fetch(`/api/public/materials/${scope}/${id}`)
      .then((r) => r.json().catch(() => ({})).then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!alive) return;
        if (ok && d.target) {
          setMeta(d.target);
          const saved = loadGuestSession(scope, id);
          if (saved?.name) {
            setName(saved.name);
            setGrade(saved.grade ?? "");
            void enter(saved.name, saved.grade ?? "");
          }
        } else {
          setLoadErr(d?.error || "Material topilmadi");
        }
        setLoading(false);
      })
      .catch(() => {
        if (alive) {
          setLoadErr("Tarmoq xatosi");
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [scope, id, enter]);

  /** Yuklab olishni jurnalga yozadi — kim nimani olgani o'qituvchiga ko'rinadi. */
  const logDownload = (postId: string, fileName: string) => {
    if (!tokenRef.current) return;
    const url = `/api/public/materials/${scope}/${id}/log`;
    const body = JSON.stringify({
      deviceId: getDeviceId(),
      token: tokenRef.current,
      postId,
      fileName,
    });
    // fayl ochilganda sahifa almashishi mumkin — beacon yetib boradi
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        url,
        new Blob([body], { type: "application/json" })
      );
      return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <main className="relative min-h-screen">
      <Aurora full intensity={0.7} className="fixed" />

      <header className="glass sticky top-0 z-30 border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            {label && (
              <span className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-surface/60 px-3 py-1 text-[12px] font-medium text-muted backdrop-blur sm:inline-flex">
                <Monitor className="h-3.5 w-3.5 text-accent" />
                {label}
              </span>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {loading ? (
          <div className="py-20 text-center text-muted">
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          </div>
        ) : loadErr ? (
          <div className="rounded-3xl border border-border bg-surface p-8 text-center shadow-card">
            <p className="text-[15px] text-muted">{loadErr}</p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> Bosh sahifa
            </Link>
          </div>
        ) : !meta ? null : materials ? (
          <MaterialList
            meta={meta}
            materials={materials}
            guestName={who}
            label={label}
            onDownload={logDownload}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border bg-surface p-6 shadow-card sm:p-8"
          >
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-2xl">
                {meta.emoji}
              </span>
              <div className="min-w-0">
                <p className="eyebrow">{meta.subject || "O'quv materiallari"}</p>
                <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
                  {meta.title}
                </h1>
                {meta.teacherName && (
                  <p className="mt-1 text-[13px] text-muted">
                    O&apos;qituvchi: {meta.teacherName}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stat
                icon={BookOpen}
                label="Dars"
                value={`${meta.lessonCount} ta`}
              />
              <Stat
                icon={FolderOpen}
                label="Fayl"
                value={`${meta.fileCount} ta`}
              />
            </div>

            {meta.description && (
              <RichContent
                text={meta.description}
                className="mt-5 text-[14px] leading-relaxed text-muted"
              />
            )}

            <div className="mt-6 space-y-3">
              <p className="text-[13px] font-semibold text-ink">
                Materiallarni ochish uchun o&apos;zingizni tanishtiring
              </p>
              <Field label="Ism-familiya">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Ali Valiyev"
                  autoFocus
                />
              </Field>
              <Field label="Sinf" hint="ixtiyoriy">
                <Input
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="9-A"
                />
              </Field>
            </div>

            {enterErr && (
              <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
                {enterErr}
              </p>
            )}

            <Button
              size="lg"
              className="mt-5 w-full"
              onClick={() => enter(name.trim(), grade.trim())}
              disabled={entering || name.trim().length < 3}
            >
              {entering ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Unlock className="h-5 w-5" />
              )}
              Materiallarni ochish
            </Button>
            <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-faint">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Kirish anonim emas: ismingiz va qurilma nomi (Kompyuter-1,
              Kompyuter-2 …) bilan birga qaysi faylni yuklab olganingiz
              o&apos;qituvchiga ko&apos;rinadi.
            </p>
          </motion.div>
        )}
      </div>
    </main>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg/40 p-3">
      <Icon className="mb-2 h-5 w-5 text-accent" />
      <p className="font-display text-lg font-semibold text-ink">{value}</p>
      <p className="text-[12px] text-faint">{label}</p>
    </div>
  );
}

function MaterialList({
  meta,
  materials,
  guestName,
  label,
  onDownload,
}: {
  meta: Meta;
  materials: PublicMaterial[];
  guestName: string;
  label: string;
  onDownload: (postId: string, fileName: string) => void;
}) {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-xl">
          {meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{meta.subject || "O'quv materiallari"}</p>
          <h1 className="font-display text-lg font-semibold text-ink">
            {meta.title}
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[12px] font-semibold text-accent">
          <UserIcon className="h-3.5 w-3.5" />
          {guestName}
          {label ? ` · ${label}` : ""}
        </span>
      </motion.div>

      <div className="space-y-4">
        {materials.map((m, i) => (
          <motion.section
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            className="rounded-2xl border border-border bg-surface p-5 shadow-card"
          >
            <h2 className="font-display text-base font-semibold text-ink">
              {m.title}
            </h2>
            <p className="mt-0.5 text-[12px] text-faint">
              {formatDate(m.createdAt)}
            </p>
            {m.body && (
              <RichContent
                text={m.body}
                className="mt-2 text-[14px] leading-relaxed text-muted"
              />
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {m.attachments.map((a) => (
                <div
                  key={a.id}
                  className="relative"
                  onClick={() => onDownload(m.id, a.name)}
                >
                  <AttachmentChip attachment={a} />
                  {a.url && (
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-faint">
                      <Download className="h-4 w-4" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.section>
        ))}
      </div>

      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Bosh sahifa
      </Link>
    </div>
  );
}
