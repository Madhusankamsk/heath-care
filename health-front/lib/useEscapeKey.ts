"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `onEscape` when Escape is pressed while `enabled` is true.
 * Uses a ref so the latest callback runs without re-binding the listener on every render.
 */
export function useEscapeKey(onEscape: () => void, enabled: boolean) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscapeRef.current();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
