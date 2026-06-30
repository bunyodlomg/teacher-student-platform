import { SubmissionStatus } from "@/lib/types";
import { Badge } from "./Badge";

const map: Record<
  SubmissionStatus,
  { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" }
> = {
  not_started: { label: "Boshlanmagan", tone: "neutral" },
  draft: { label: "Qoralama", tone: "warning" },
  submitted: { label: "Topshirildi", tone: "accent" },
  approved: { label: "Baholandi", tone: "success" },
  rejected: { label: "Tuzatish kerak", tone: "danger" },
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const m = map[status];
  return (
    <Badge tone={m.tone} dot>
      {m.label}
    </Badge>
  );
}
