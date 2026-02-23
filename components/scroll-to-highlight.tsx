"use client";

import { useEffect } from "react";

export function ScrollToHighlight({ highlightId }: { highlightId: string | undefined }) {
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`notification-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [highlightId]);

  return null;
}
