import Link from "next/link";
import { MapPin, Star } from "lucide-react";
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

/** Carrossel automático e contínuo (dados reais). Pausa no hover. */
export function FeaturedProfessionals({ providers }: FeaturedProps) {
  if (providers.length === 0) return null;

  // Repete a lista para o loop ficar sempre mais largo que a tela
  const half =
    providers.length >= 4
      ? providers
      : Array.from({ length: 4 }, (_, i) => providers[i % providers.length]);

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
        </div>
      </FadeIn>

      <div className="marquee relative -mx-4 mt-6 overflow-hidden md:mx-0 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
        <div className="animate-marquee flex w-max">
          {[false, true].map((isClone) => (
            <div key={isClone ? "clone" : "original"} className="flex gap-4 pr-4" aria-hidden={isClone || undefined}>
              {half.map((p, i) => (
                <article
                  key={`${p.id}-${i}`}
                  className="card w-[280px] shrink-0 p-5"
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
          ))}
        </div>
      </div>
    </section>
  );
}

export type { FeaturedCardData };
