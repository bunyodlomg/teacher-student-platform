import { Attachment } from "@/lib/types";

/**
 * Upload a single file to /api/upload. Returns the created Attachment or an
 * (o'zbekcha) error message. Shared by FileDrop and the modal-wide drop zone
 * so both paths behave identically.
 */
export async function uploadAttachment(
  file: File
): Promise<{ attachment?: Attachment; error?: string }> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.attachment) {
      return { attachment: data.attachment as Attachment };
    }
    return { error: data?.error || `"${file.name}" yuklanmadi` };
  } catch {
    return { error: `"${file.name}" yuklanmadi` };
  }
}
