"use client";

import { useEffect, useRef } from "react";
import { trackProfileViewAction } from "@/server/actions/tracking";

/** Registra 1 visualização por sessão do navegador por prestador. */
export function ProfileViewTracker({ providerId }: { providerId: number }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const key = `ea_viewed_${providerId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage indisponível — segue sem dedupe
    }
    fired.current = true;
    void trackProfileViewAction(providerId);
  }, [providerId]);

  return null;
}
