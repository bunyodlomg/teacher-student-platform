"use client";

import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  LayoutGrid,
  LineChart,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";

const ease = [0.16, 1, 0.3, 1] as const;

const features = [
  {
    icon: BookOpen,
    title: "Dars lentasi",
    desc: "Matn, video, audio va fayllar bilan tartibli dars oqimi. O'quvchilar izoh va reaksiya qoldiradi.",
  },
  {
    icon: ClipboardCheck,
    title: "Topshiriq va baholash",
    desc: "Muddatli topshiriqlar bering, ishlarni bir joyda ko'ring, ball va izoh bilan baholang.",
  },
  {
    icon: BellRing,
    title: "Real vaqtli bildirishnoma",
    desc: "Yangi dars, topshiriq yoki baho — hamma narsa darhol tegishli odamga yetib boradi.",
  },
  {
    icon: LineChart,
    title: "Natijalar va progress",
    desc: "Har bir o'quvchi o'z o'rtacha bahosi, bajarilgan ishlari va kunlik faolligini kuzatadi.",
  },
];

const roles = [
  {
    icon: GraduationCap,
    title: "O'qituvchi",
    points: ["Dars va topshiriq joylash", "Ishlarni tekshirish va baholash", "Guruh faolligini kuzatish"],
  },
  {
    icon: Users,
    title: "O'quvchi",
    points: ["Darslarni ko'rish va o'qish", "Topshiriqlarni topshirish", "Baho va izohlarni olish"],
  },
  {
    icon: ShieldCheck,
    title: "Administrator",
    points: ["Foydalanuvchilarni boshqarish", "Guruhlarni yaratish", "O'qituvchi biriktirish"],
  },
];

export default function Landing() {
  return (
    <main className="relative min-h-screen">
      {/* nav */}
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-medium text-accent-ink transition-transform hover:-translate-y-0.5"
            >
              Tizimga kirish
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-muted shadow-soft"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Zamonaviy o'quv platformasi
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, delay: 0.06 }}
            className="mt-6 font-display text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-ink text-balance sm:text-[64px]"
          >
            O'qituvchi va o'quvchilar uchun{" "}
            <span className="text-accent">yagona makon</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, delay: 0.12 }}
            className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted text-pretty"
          >
            Darslar, topshiriqlar, baholash va bildirishnomalar — barchasi bitta
            sodda va tezkor platformada. Ortiqcha murakkablik yo'q.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, delay: 0.18 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/login"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-medium text-accent-ink transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              Tizimga kirish
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#imkoniyatlar"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border px-6 text-[15px] font-medium text-ink transition-colors hover:bg-elevated sm:w-auto"
            >
              Imkoniyatlar bilan tanishish
            </a>
          </motion.div>
        </div>

        {/* hero visual */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease, delay: 0.26, duration: 0.8 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-lift">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-border" />
                <span className="h-2.5 w-2.5 rounded-full border border-border" />
                <span className="h-2.5 w-2.5 rounded-full border border-border" />
              </div>
              <div className="mx-auto font-mono text-[11px] tracking-wide text-faint">
                cambridge-learn.uz
              </div>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-3">
              {[
                { k: "Faol guruhlar", v: "12", icon: LayoutGrid },
                { k: "Topshiriqlar", v: "48", icon: ClipboardCheck },
                { k: "O'rtacha baho", v: "92%", icon: LineChart },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.k}
                    className="rounded-xl border border-border bg-bg/40 p-4"
                  >
                    <Icon className="h-5 w-5 text-accent" strokeWidth={1.9} />
                    <div className="mt-3 font-display text-3xl font-medium text-ink">
                      {s.v}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">
                      {s.k}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* features */}
      <section id="imkoniyatlar" className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="eyebrow">Imkoniyatlar</p>
          <h2 className="mt-3 font-display text-[30px] font-medium leading-tight tracking-[-0.01em] text-ink sm:text-[40px]">
            O'qitish uchun kerak bo'lgan hamma narsa
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ease, delay: i * 0.06 }}
                className="rounded-2xl border border-border bg-surface p-5 shadow-card"
              >
                <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" strokeWidth={1.9} />
                </span>
                <h3 className="mt-4 font-display text-lg font-medium text-ink">
                  {f.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* roles */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <p className="eyebrow">Har bir rol uchun</p>
          <h2 className="mt-3 font-display text-[30px] font-medium leading-tight tracking-[-0.01em] text-ink sm:text-[40px]">
            Har kim o'z ishini sodda bajaradi
          </h2>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {roles.map((r, i) => {
            const Icon = r.icon;
            return (
              <motion.div
                key={r.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ease, delay: i * 0.06 }}
                className="rounded-2xl border border-border bg-surface p-6 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
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
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center shadow-lift sm:p-16">
          <h2 className="mx-auto max-w-2xl font-display text-[28px] font-medium leading-tight tracking-[-0.01em] text-ink text-balance sm:text-[38px]">
            Bugundan o'qitishni soddalashtiring
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted">
            Hisobingizga kiring va guruhingiz bilan ishlashni boshlang.
          </p>
          <Link
            href="/login"
            className="group mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-[15px] font-medium text-accent-ink transition-transform hover:-translate-y-0.5"
          >
            Tizimga kirish
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-border">
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
