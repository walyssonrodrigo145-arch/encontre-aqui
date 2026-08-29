"use client";

import { useEffect, useState } from "react";

/** Adiciona sombra sutil ao header após rolar a página */
export function HeaderScrollShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={
        scrolled
          ? "sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl transition-shadow duration-300 shadow-[0_4px_20px_rgba(20,18,31,0.06)]"
          : "sticky top-0 z-40 border-b border-transparent bg-white/80 backdrop-blur-xl transition-shadow duration-300"
      }
    >
      {children}
    </div>
  );
}
