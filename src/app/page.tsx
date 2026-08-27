"use client";

import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  Aurora,
  GlassCard,
  GradientText,
  GsapReveal,
  Magnetic,
  ShimmerButton,
} from "@/components/motion";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  ClipboardCheck,
  Clock,
  GraduationCap,
  LayoutGrid,
  LineChart,
  ListChecks,
  Play,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

interface PublicTestMeta {
  id: string;
  title: string;
  subject: string;
  description: string;
  durationMin: number;
  questionCount: number;
}

/** Landing'да loginsiz ishlash mumkin bo'lgan ochiq testlar. */
function PublicTests() {
  const [tests, setTests] = useState<PublicTestMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/public/tests")
      .then((r) => (r.ok ? r.json() : { tests: [] }))
      .then((d) => alive && setTests(d.tests ?? []))
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  if (!loaded || tests.length === 0) return null;

  return (
    <section id="testlar" className="relative mx-auto max-w-6xl px-6 py-12">
      <div className="max-w-2xl">
        <p className="eyebrow">Ochiq testlar</p>
        <h2 className="mt-3 font-display text-[28px] font-medium leading-tight tracking-[-0.01em] text-ink sm:text-[36px]">
          Loginsiz ishlash mumkin
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Testни tanlang, ism-familiyangizni kiriting va boshlang.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((t) => (
          <Link key={t.id} href={`/t/${t.id}`}>
            <GlassCard className="h-full p-5 transition-transform hover:-translate-y-1">
              <p className="eyebrow">{t.subject || "Online test"}</p>
              <h3 className="mt-1.5 font-display text-lg font-medium text-ink">
                {t.title}
              </h3>
              {t.description && (
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">
                  {t.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 text-[12px] text-muted">
                <span className="flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5 text-faint" />
                  {t.questionCount} savol
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-faint" />
                  {t.durationMin} daqiqa
                </span>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-ink shadow-glow-accent">
                <Play className="h-3.5 w-3.5" /> Boshlash
              </span>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  );
}

const features = [
  {
    icon: BookOpen,
    title: "Dars lentasi",
    desc: "Matn, video, audio va fayl joylang. O'quvchilar izoh va reaksiya qoldiradi.",
  },
  {
    icon: ClipboardCheck,
    title: "Topshiriq va baho",
    desc: "Topshiriq bering, ishlarni bir joyda ko'ring, ball va izoh yozing.",
  },
  {
    icon: BellRing,
    title: "Tezkor xabar",
    desc: "Yangi dars, topshiriq yoki baho — darhol xabar boradi.",
  },
  {
    icon: LineChart,
    title: "Natija va progress",
    desc: "Har bir o'quvchi o'z bahosi va bajargan ishlarini ko'radi.",
  },
];

const roles = [
  {
    icon: GraduationCap,
    title: "O'qituvchi",
    points: [
      "Dars va topshiriq joylash",
      "Ishlarni tekshirish va baholash",
      "Guruh faolligini kuzatish",
    ],
  },
  {
    icon: Users,
    title: "O'quvchi",
    points: [
      "Darslarni ko'rish va o'qish",
      "Topshiriqlarni topshirish",
      "Baho va izohlarni olish",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Administrator",
    points: [
      "Foydalanuvchilarni boshqarish",
      "Guruhlarni yaratish",
      "O'qituvchi biriktirish",
    ],
  },
];

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Aurora full intensity={0.9} className="fixed" />

      {/* nav */}
      <header className="glass sticky top-0 z-30 border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Magnetic strength={0.2}>
              <Link
                href="/login"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-medium text-accent-ink shadow-glow-accent transition-transform hover:-translate-y-0.5"
              >
                Tizimga kirish
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease }}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface/60 px-3 py-1 text-[12px] font-medium text-muted backdrop-blur"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Maktab o'quv platformasi
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, delay: 0.06 }}
            className="mt-6 font-display text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-ink text-balance sm:text-[64px]"
          >
            O'qituvchi va o'quvchilar uchun{" "}
            <GradientText>bitta joy</GradientText>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, delay: 0.12 }}
            className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted text-pretty"
          >
            Darslar, topshiriqlar, baholar va xabarlar — hammasi bitta joyda.
            Oddiy va tez.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, delay: 0.18 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/login">
              <ShimmerButton className="w-full sm:w-auto">
                Tizimga kirish
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ShimmerButton>
            </Link>
            <a
              href="#imkoniyatlar"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface/50 px-6 text-[15px] font-medium text-ink backdrop-blur transition-colors hover:bg-elevated sm:w-auto"
            >
              Imkoniyatlarni ko'rish
            </a>
          </motion.div>
        </div>

        {/* hero visual */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease, delay: 0.26, duration: 0.8 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <GlassCard lift={false} className="overflow-hidden p-0">
            <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
              </div>
              <div className="mx-auto font-mono text-[11px] tracking-wide text-faint">
                learn.cambridgeschool.uz
              </div>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-3">
              {[
                { k: "Faol guruhlar", v: "12", icon: LayoutGrid },
                { k: "Topshiriqlar", v: "48", icon: ClipboardCheck },
                { k: "O'rtacha baho", v: "92%", icon: LineChart },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={s.k}
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 5 + i,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.4,
                    }}
                    className="rounded-xl border border-border/70 bg-surface/50 p-4 backdrop-blur"
                  >
                    <span className="inline-grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                      <Icon className="h-5 w-5" strokeWidth={1.9} />
                    </span>
                    <div className="mt-3 font-display text-3xl font-medium text-ink">
                      {s.v}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                      {s.k}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </section>

      {/* ochiq testlar — bo'lsa ko'rsatiladi */}
      <PublicTests />

      {/* features */}
      <section id="imkoniyatlar" className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="eyebrow">Imkoniyatlar</p>
          <h2 className="mt-3 font-display text-[30px] font-medium leading-tight tracking-[-0.01em] text-ink sm:text-[40px]">
            O'qitish uchun kerakli hamma narsa
          </h2>
        </div>
        <GsapReveal className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <GlassCard key={f.title} data-reveal className="p-5">
                <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent shadow-[0_0_18px_-6px_rgb(var(--accent)/0.6)]">
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <h3 className="mt-4 font-display text-lg font-medium text-ink">
                  {f.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  {f.desc}
                </p>
              </GlassCard>
            );
          })}
        </GsapReveal>
      </section>

      {/* roles */}
      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="eyebrow">Har bir rol uchun</p>
          <h2 className="mt-3 font-display text-[30px] font-medium leading-tight tracking-[-0.01em] text-ink sm:text-[40px]">
            Har kim o'z ishini oson qiladi
          </h2>
        </div>
        <GsapReveal className="mt-10 grid gap-4 lg:grid-cols-3">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <GlassCard key={r.title} data-reveal className="p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent shadow-[0_0_18px_-6px_rgb(var(--accent)/0.6)]">
                    <Icon className="h-5 w-5" strokeWidth={1.9} />
                  </span>
                  <h3 className="font-display text-xl font-medium text-ink">
                    {r.title}
                  </h3>
                </div>
                <ul className="mt-5 space-y-2.5">
                  {r.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2.5 text-[14px] text-muted"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {p}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            );
          })}
        </GsapReveal>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="border-gradient relative overflow-hidden rounded-3xl p-10 text-center shadow-lift sm:p-16">
          <Aurora full intensity={0.8} />
          <h2 className="relative mx-auto max-w-2xl font-display text-[28px] font-medium leading-tight tracking-[-0.01em] text-ink text-balance sm:text-[38px]">
            Bugundan ishlashni <GradientText>boshlang</GradientText>
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
            Kiring va guruhingiz bilan ishlang.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Link href="/login">
              <ShimmerButton>
                Tizimga kirish
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </ShimmerButton>
            </Link>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="relative border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Logo />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
            © 2026 Cambridge Learn · O'zbek tilida
          </p>
        </div>
      </footer>
    </main>
  );
}
