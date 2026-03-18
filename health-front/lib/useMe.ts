"use client";

import { useEffect, useState } from "react";

import type { BackendMeResponse } from "@/lib/backend";

type UseMeState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; me: BackendMeResponse }
  | { status: "error" };

export function useMe(): UseMeState {
  const [state, setState] = useState<UseMeState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setState({ status: "unauthenticated" });
          return;
        }
        const me = (await res.json().catch(() => null)) as BackendMeResponse | null;
        if (!me) {
          if (!cancelled) setState({ status: "error" });
          return;
        }
        if (!cancelled) setState({ status: "authenticated", me });
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

