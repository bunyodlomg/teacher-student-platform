"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { DatePicker } from "@/components/ui/DatePicker";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FileDrop } from "@/components/ui/FileDrop";
import { ClickSpark, ElasticSlider, StarBorder, Magnetic } from "@/components/reactbits";
import { Attachment, PostType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useData } from "@/store/data";
import { useSession } from "@/store/session";
import { Award, Send } from "lucide-react";
import { useState } from "react";

type Mode = "lesson" | "announcement" | "assignment";

export function Composer({
  open,
  onClose,
  groupId,
  defaultMode = "lesson",
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  defaultMode?: Mode;
}) {
  const teacherId = useSession((s) => s.currentUserId)!;
  const addPost = useData((s) => s.addPost);
  const createAssignment = useData((s) => s.createAssignment);

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [points, setPoints] = useState(100);
  const [due, setDue] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [allowSubmissions, setAllowSubmissions] = useState(false);

  const reset = () => {
    setTitle("");
    setBody("");
    setTags("");
    setPoints(100);
    setDue("");
    setFiles([]);
    setAllowSubmissions(false);
  };

  const canSubmit =
    title.trim() && (mode !== "assignment" || (due && points > 0));

  const submit = () => {
    if (!canSubmit) return;
    if (mode === "assignment") {
      createAssignment({
        groupId,
        authorId: teacherId,
        title: title.trim(),
        description: body.trim(),
        dueDate: due ? new Date(due).toISOString() : new Date().toISOString(),
        points,
        attachments: files,
      });
    } else {
      addPost({
        groupId,
        authorId: teacherId,
        type: mode as PostType,
        title: title.trim(),
        body: body.trim(),
        tags: tags
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : undefined,
        attachments: files,
        // dars uchun: topshirishga ruxsat → bog'langan vazifa yaratiladi
        allowSubmissions: mode === "lesson" ? allowSubmissions : undefined,
        dueDate:
          mode === "lesson" && allowSubmissions && due
            ? new Date(due).toISOString()
            : undefined,
        points: mode === "lesson" && allowSubmissions ? points : undefined,
      });
    }
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      className="sm:max-w-xl"
      title="Guruhingiz bilan ulashing"
      description="U guruh lentasida paydo bo'ladi va har bir o'quvchiga xabar beriladi."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Bekor qilish
          </Button>
          <Magnetic strength={0.25}>
            <StarBorder
              onClick={submit}
              disabled={!canSubmit}
              className={cn(!canSubmit && "pointer-events-none opacity-50")}
              innerClassName="flex items-center gap-2 px-5 py-2 text-[14px]"
            >
              <Send className="h-4 w-4" />
              {mode === "assignment" ? "Topshiriqni joylash" : "Chop etish"}
            </StarBorder>
          </Magnetic>
        </>
      }
    >
      <ClickSpark className="space-y-3">
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          segments={[
            { value: "lesson", label: "Dars" },
            { value: "announcement", label: "E'lon" },
            { value: "assignment", label: "Topshiriq" },
          ]}
        />

        <Field label="Sarlavha">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              mode === "assignment"
                ? "masalan: Matn tahlili — 4-bob"
                : "Bu nima haqida?"
            }
            autoFocus
          />
        </Field>

        <Field label={mode === "assignment" ? "Ko'rsatmalar" : "Matn"}>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[72px]"
            placeholder={
              mode === "assignment"
                ? "O'quvchilar nima qilishi va qanday baholanishi kerak?"
                : "O'qishga arzigulik biror narsa yozing…"
            }
          />
        </Field>

        {mode === "assignment" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Muddati">
              <DatePicker value={due} onChange={setDue} />
            </Field>
            <Field label={`Ball — ${points}`}>
              <div className="pt-3">
                <ElasticSlider
                  value={points}
                  onChange={setPoints}
                  min={5}
                  max={100}
                  leftIcon={<Award className="h-4 w-4" />}
                />
              </div>
            </Field>
          </div>
        )}

        {mode === "lesson" && (
          <>
            <Field label="Teglar" hint="vergul bilan ajrating">
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Ramz, Matn tahlili"
              />
            </Field>

            {/* submissions toggle */}
            <div className="rounded-xl border border-border bg-bg/40 p-3">
              <button
                type="button"
                onClick={() => setAllowSubmissions((v) => !v)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span>
                  <span className="block text-[13px] font-semibold text-ink">
                    Vazifa topshirishga ruxsat
                  </span>
                  <span className="block text-[12px] text-muted">
                    O'quvchilar shu dars uchun ish topshira oladi
                  </span>
                </span>
                <span
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    allowSubmissions ? "bg-accent" : "bg-elevated"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all",
                      allowSubmissions ? "left-[22px]" : "left-0.5"
                    )}
                  />
                </span>
              </button>

              {allowSubmissions && (
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
                  <Field label="Muddati" hint="ixtiyoriy">
                    <DatePicker value={due} onChange={setDue} />
                  </Field>
                  <Field label={`Ball — ${points}`}>
                    <div className="pt-3">
                      <ElasticSlider
                        value={points}
                        onChange={setPoints}
                        min={5}
                        max={100}
                        leftIcon={<Award className="h-4 w-4" />}
                      />
                    </div>
                  </Field>
                </div>
              )}
            </div>
          </>
        )}

        <FileDrop value={files} onChange={setFiles} />
      </ClickSpark>
    </Modal>
  );
}
