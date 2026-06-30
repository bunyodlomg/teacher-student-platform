"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { useSession } from "@/store/session";
import { Camera, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

// literal class strings so Tailwind keeps these gradients in the build
const HUES = [
  "from-indigo-500 to-blue-400",
  "from-violet-500 to-fuchsia-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-orange-400",
  "from-rose-500 to-pink-400",
  "from-sky-500 to-cyan-400",
  "from-lime-500 to-emerald-400",
  "from-fuchsia-500 to-purple-400",
];

const roleLabel: Record<string, string> = {
  admin: "Administrator",
  teacher: "O'qituvchi",
  student: "O'quvchi",
};

export function ProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const user = useSession((s) => s.user);
  const updateProfile = useSession((s) => s.updateProfile);

  const [name, setName] = useState(user?.name ?? "");
  const [headline, setHeadline] = useState(user?.headline ?? "");
  const [hue, setHue] = useState(user?.hue ?? HUES[0]);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // re-sync fields whenever the modal is (re)opened for the current user
  const [syncKey, setSyncKey] = useState<string | null>(null);
  if (open && user && syncKey !== user.id) {
    setSyncKey(user.id);
    setName(user.name);
    setHeadline(user.headline ?? "");
    setHue(user.hue);
    setAvatarUrl(user.avatarUrl ?? "");
    setCurPw("");
    setNewPw("");
    setError("");
  }
  if (!open && syncKey !== null) setSyncKey(null);

  if (!user) return null;

  const uploadAvatar = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.attachment?.url) setAvatarUrl(data.attachment.url);
      else setError(data?.error || "Rasm yuklanmadi");
    } catch {
      setError("Rasm yuklanmadi");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const payload: Record<string, string> = {
      name,
      headline,
      hue,
      avatarUrl,
    };
    if (newPw) {
      payload.currentPassword = curPw;
      payload.newPassword = newPw;
    }
    const res = await updateProfile(payload);
    setSaving(false);
    if (!res.ok) {
      setError(res.error || "Saqlashda xatolik");
      return;
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profil sozlamalari"
      description="Ismingiz, ko'rinishingiz va parolingizni boshqaring."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Yopish
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={saving || uploading || !name.trim()}
          >
            {saving ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* live preview + avatar upload */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-bg/40 p-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative shrink-0"
            title="Rasm yuklash"
          >
            <Avatar user={{ name: name || "?", hue, avatarUrl }} size="lg" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) uploadAvatar(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold text-ink">
              {name || "Ismsiz"}
            </p>
            <p className="truncate text-[12px] text-muted">
              {roleLabel[user.role]} · @{user.email}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[12px] font-medium text-accent hover:underline"
              >
                Rasm yuklash
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-muted hover:text-danger"
                >
                  <X className="h-3 w-3" /> O'chirish
                </button>
              )}
            </div>
          </div>
        </div>

        <Field label="To'liq ism">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Bio / lavozim" hint="ixtiyoriy">
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="masalan: IELTS o'qituvchisi"
          />
        </Field>

        <div>
          <p className="mb-2 text-[13px] font-medium text-ink">Avatar rangi</p>
          <div className="flex flex-wrap gap-2">
            {HUES.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHue(h)}
                className={cn(
                  "h-9 w-9 rounded-full bg-gradient-to-br ring-offset-2 ring-offset-surface transition-transform hover:scale-110",
                  h,
                  hue === h ? "ring-2 ring-accent" : "ring-0"
                )}
                aria-label="Rang tanlash"
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 text-[13px] font-medium text-ink">
            Parolni o'zgartirish
          </p>
          <div className="space-y-3">
            <Field label="Joriy parol">
              <Input
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Field>
            <Field label="Yangi parol" hint="kamida 6 belgi">
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
