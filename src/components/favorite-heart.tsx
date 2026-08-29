"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/server/actions/favorites";
import { cn } from "@/lib/utils";

export function FavoriteHeart({
  providerId,
  initial = false,
  className,
}: {
  providerId: number;
  initial?: boolean;
  className?: string;
}) {
  const [fav, setFav] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setFav((v) => !v);
        startTransition(async () => {
          await toggleFavoriteAction(providerId).catch(() => setFav((v) => !v));
        });
      }}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-90",
        fav
          ? "bg-red-50 text-[var(--danger)]"
          : "bg-slate-50 text-slate-300 hover:text-[var(--danger)]",
        className,
      )}
    >
      <Heart size={18} className={fav ? "fill-[var(--danger)]" : ""} />
    </button>
  );
}
