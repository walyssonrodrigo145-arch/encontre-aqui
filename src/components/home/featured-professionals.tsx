"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import { FadeIn } from "@/components/motion";
import type { RankedProvider } from "@/server/services/search";

interface FeaturedProps {
  providers: RankedProvider[];
}

interface FeaturedCardData {
  id: number;
  name: string;
  slug: string;
  headline: string | null;
  city: string;
  state: string;
  verificationLevel: string;
  ratingAvg: number;
  ratingCount: number;
  availableToday: boolean;
}

/** Carrossel horizontal de profissionais em destaque (dados reais) */
export function FeaturedProfessionals({ providers }: FeaturedProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  if (providers.length === 0) return null;

  return (
    <section id="destaques" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-12 md:px-6 md:py-16">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 md:text-2xl">
              Profissionais bem avaliados perto de você
            </h2>
            <p className="mt-1 text-[15px] text-slate-500">
              Encontre especialistas recomendados pela comunidade.
            </p>
          </div>
          <div className="hidden gap-2 md:flex">
            <button
              onClick={() => scroll(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-slate-500 transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scroll(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white text-slate-500 transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              aria-label="Próximo"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </FadeIn>

      <div
        ref={trackRef}
        className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0"
      >
        {providers.map((p) => (
          <article
            key={p.id}
            className="card card-hover w-[280px] shrink-0 snap-start p-5"
          >
            <div className="flex items-start justify-between">
              <Avatar name={p.displayName} size={56} className="rounded-2xl" />
              {p.verificationLevel !== "NONE" && <VerifiedBadge level={p.verificationLevel} />}
            </div>
            <h3 className="font-display mt-3 truncate text-base font-bold text-slate-900">
              {p.displayName}
            </h3>
            <p className="truncate text-sm text-slate-500">{p.headline ?? "Profissional"}</p>
            <div className="mt-2.5 flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1">
                <Star size={15} className="fill-[var(--accent)] text-[var(--accent)]" />
                <b className="text-slate-800">{p.ratingAvg.toFixed(1).replace(".", ",")}</b>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">{p.ratingCount} avaliações</span>
            </div>
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-400">
              <MapPin size={12} /> {p.city} - {p.state}
            </p>
            {p.availableToday && (
              <p className="badge-success mt-2.5 inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                Disponível hoje
              </p>
            )}
            <Link href={`/p/${p.slug}`} className="btn-outline mt-4 w-full py-2.5 text-sm">
              Ver perfil
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export type { FeaturedCardData };
