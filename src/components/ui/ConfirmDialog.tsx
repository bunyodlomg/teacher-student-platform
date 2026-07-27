"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";
import { useState } from "react";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  body,
  confirmLabel = "Tasdiqlash",
  cancelLabel = "Bekor qilish",
  tone = "danger",
  busyLabel,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busyLabel?: string;
}) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      className="sm:max-w-md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={run}
            disabled={busy}
          >
            {busy ? busyLabel ?? "Bajarilmoqda…" : confirmLabel}
          </Button>
        </>
      }
    >
      {body && <div className="text-[14px] text-muted">{body}</div>}
    </Modal>
  );
}
