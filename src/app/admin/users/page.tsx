"use client";

import { PageHeader } from "@/components/app/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Aurora } from "@/components/motion";
import { Role } from "@/lib/types";
import { useData } from "@/store/data";
import { motion } from "framer-motion";
import { Plus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

type Filter = "all" | "admin" | "teacher" | "student";

const roleLabel = (r: Role) =>
  r === "admin" ? "Administrator" : r === "teacher" ? "O'qituvchi" : "O'quvchi";
const roleTone = (r: Role) =>
  r === "admin" ? "accent" : r === "teacher" ? "success" : "neutral";

export default function AdminUsers() {
  const users = useData((s) => s.users);
  const addUser = useData((s) => s.addUser);

  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const counts = useMemo(
    () => ({
      all: users.length,
      admin: users.filter((u) => u.role === "admin").length,
      teacher: users.filter((u) => u.role === "teacher").length,
      student: users.filter((u) => u.role === "student").length,
    }),
    [users]
  );

  const list = users.filter((u) => filter === "all" || u.role === filter);

  const create = async () => {
    if (!name.trim() || !email.trim() || busy) return;
    setBusy(true);
    setFormError("");
    const res = await addUser({
      name: name.trim(),
      email: email.trim(),
      role,
      headline: headline.trim() || undefined,
      password: password.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error || "Xatolik yuz berdi");
      return;
    }
    setCreated({
      email: email.trim().toLowerCase(),
      password: res.tempPassword || "cambridge123",
    });
    setName("");
    setEmail("");
    setHeadline("");
    setPassword("");
    setRole("student");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Aurora />
      <PageHeader
        eyebrow="Foydalanuvchilar"
        title="Hisoblarni boshqarish"
        subtitle="O'qituvchi va o'quvchilarni qo'shing hamda rollarni ko'ring."
        gradient
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Yangi foydalanuvchi
          </Button>
        }
      />

      {created && (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-[13px]">
          <span className="font-semibold text-ink">Hisob yaratildi.</span>
          <span className="text-muted">
            Kirish: <span className="font-mono text-ink">{created.email}</span> ·
            vaqtinchalik parol:{" "}
            <span className="font-mono text-ink">{created.password}</span>
          </span>
          <button
            onClick={() => setCreated(null)}
            className="ml-auto text-[12px] font-medium text-faint hover:text-ink"
          >
            Yopish
          </button>
        </div>
      )}

      <SegmentedControl
        className="mb-5"
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
        segments={[
          { value: "all", label: "Barchasi", count: counts.all },
          { value: "teacher", label: "O'qituvchilar", count: counts.teacher },
          { value: "student", label: "O'quvchilar", count: counts.student },
          { value: "admin", label: "Adminlar", count: counts.admin },
        ]}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-elevated/40 text-[11px] uppercase tracking-wider text-faint">
                <th className="px-4 py-3 font-semibold">Foydalanuvchi</th>
                <th className="px-4 py-3 font-semibold">Login</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Tavsif</th>
                <th className="px-4 py-3 text-right font-semibold">Rol</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted">
                    Foydalanuvchi topilmadi.
                  </td>
                </tr>
              ) : (
                list.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: Math.min(i * 0.03, 0.3),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="border-b border-border transition-colors last:border-0 hover:bg-elevated/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size="sm" />
                        <span className="font-semibold text-ink">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-muted">
                      {u.email}
                    </td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">
                      {u.headline ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge
                        tone={
                          roleTone(u.role) as "accent" | "success" | "neutral"
                        }
                      >
                        {roleLabel(u.role)}
                      </Badge>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Yangi foydalanuvchi"
        description="Yangi hisob yarating va unga rol biriktiring."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              size="sm"
              onClick={create}
              disabled={!name.trim() || !email.trim() || busy}
            >
              <UserPlus className="h-4 w-4" /> {busy ? "Saqlanmoqda…" : "Qo'shish"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="To'liq ism">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ism Familiya" autoFocus />
          </Field>
          <Field label="Login" hint="oddiy matn, masalan: olim">
            <Input type="text" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="masalan: olim" />
          </Field>
          <Field label="Rol">
            <SegmentedControl
              value={role}
              onChange={(v) => setRole(v as Role)}
              segments={[
                { value: "student", label: "O'quvchi" },
                { value: "teacher", label: "O'qituvchi" },
                { value: "admin", label: "Admin" },
              ]}
            />
          </Field>
          <Field label="Tavsif" hint="ixtiyoriy">
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="masalan: B2 daraja yoki IELTS o'qituvchisi" />
          </Field>
          <Field label="Parol" hint="bo'sh qoldirsangiz: cambridge123">
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Vaqtinchalik parol"
            />
          </Field>
          {formError && (
            <p className="text-[13px] font-medium text-danger">{formError}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
