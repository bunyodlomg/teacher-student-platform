"use client";

import { Field, Input } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Aurora, GradientText, ShimmerButton } from "@/components/motion";
import { Role } from "@/lib/types";
import { useSession } from "@/store/session";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

const routeFor = (role: Role) =>
  role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";

export default function LoginPage() {
  const router = useRouter();
  const login = useSession((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "Login yoki parol noto'g'ri.");
      return;
    }
    if (result.role) router.push(routeFor(result.role));
  };

  return (
    <main className="relative grid min-h-screen overflow-hidden lg:grid-cols-2">
      <Aurora full intensity={1.1} />

      {/* chap: forma */}
      <div className="relative flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease, duration: 0.6 }}
            className="mx-auto w-full max-w-sm"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface/60 px-3 py-1 text-[12px] font-medium text-muted backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Cambridge Learn
            </span>
            <h1 className="mt-4 font-display text-[36px] font-medium leading-tight tracking-[-0.01em] text-ink">
              Xush <GradientText>kelibsiz</GradientText>
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Davom etish uchun hisobingizga kiring.
            </p>

            {/* glass form card */}
            <form
              onSubmit={submit}
              className="glass-card mt-7 space-y-4 rounded-2xl border border-border/70 p-6"
            >
              <Field label="Login">
                <Input
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="Loginingiz"
                  autoFocus
                />
              </Field>
              <Field label="Parol">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                />
              </Field>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger"
                >
                  {error}
                </motion.p>
              )}

              <ShimmerButton
                type="submit"
                disabled={loading}
                magnetic={false}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Kirish
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </ShimmerButton>
            </form>

            <p className="mt-6 text-[13px] leading-relaxed text-muted">
              Hisobingiz yo'qmi? Administrator sizga hisob yaratib beradi.
            </p>
          </motion.div>
        </div>
      </div>

      {/* o'ng: editorial glass panel */}
      <div className="relative hidden overflow-hidden border-l border-border/60 lg:block">
        <div className="glass-strong absolute inset-0" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Tizim faol
          </div>
          <div>
            <p className="font-display text-[40px] font-medium leading-[1.15] tracking-[-0.01em] text-ink text-balance">
              “O'rganish <span className="italic text-gradient">sokin</span>{" "}
              bo'lganda, chuqurroq bo'ladi.”
            </p>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
              Cambridge Learn · IELTS &amp; General English
            </p>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
            © 2026 · O'zbek tilida
          </div>
        </div>
      </div>
    </main>
  );
}
