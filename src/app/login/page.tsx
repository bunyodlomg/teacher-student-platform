"use client";

import { Field, Input } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Role } from "@/lib/types";
import { useSession } from "@/store/session";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
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
    <main className="relative grid min-h-screen lg:grid-cols-2">
      {/* chap: forma */}
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease }}
            className="mx-auto w-full max-w-sm"
          >
            <p className="eyebrow">Cambridge Learn</p>
            <h1 className="mt-3 font-display text-[34px] font-medium leading-tight tracking-[-0.01em] text-ink">
              Xush kelibsiz
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Davom etish uchun hisobingizga kiring.
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4">
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
                <p className="text-[13px] font-medium text-danger">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-medium text-accent-ink transition-transform hover:-translate-y-0.5 disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Kirish
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-[13px] leading-relaxed text-muted">
              Hisobingiz yo'qmi? Administrator sizga hisob yaratib beradi.
            </p>
          </motion.div>
        </div>
      </div>

      {/* o'ng: editorial panel */}
      <div className="relative hidden overflow-hidden border-l border-border bg-elevated/40 lg:block">
        <div className="flex h-full flex-col justify-between p-12">
          <div />
          <div>
            <p className="font-display text-[40px] font-medium leading-[1.15] tracking-[-0.01em] text-ink text-balance">
              “O'rganish{" "}
              <span className="italic text-accent">sokin</span> bo'lganda,
              chuqurroq bo'ladi.”
            </p>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
              Cambridge Learn · IELTS &amp; General English
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Tizim faol
          </div>
        </div>
      </div>
    </main>
  );
}
