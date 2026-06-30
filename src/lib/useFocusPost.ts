"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * When the URL carries `?post=<id>` (e.g. from global search), scroll that
 * post into view and briefly highlight it. `ready` should flip true once the
 * feed has rendered so the target element exists.
 */
export function useFocusPost(ready: boolean) {
  const sp = useSearchParams();
  const postId = sp.get("post");

  useEffect(() => {
    if (!postId || !ready) return;
    const el = document.getElementById(`post-${postId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-accent", "shadow-glow-accent");
    const t = setTimeout(() => {
      el.classList.remove("ring-2", "ring-accent", "shadow-glow-accent");
    }, 2600);
    return () => clearTimeout(t);
  }, [postId, ready]);
}
