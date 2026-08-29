import Link from "next/link";
import { BadgeCheck, Star, MapPin } from "lucide-react";
import { Avatar } from "./ui";
import { FavoriteHeart } from "./favorite-heart";
import { formatDistance, formatMoney } from "@/lib/utils";
import type { RankedProvider } from "@/server/services/search";

export function ProviderCard({
  p,
  favorited = false,
  canFavorite = false,
}: {
  p: RankedProvider;
  favorited?: boolean;
  /** exibe o coração apenas para clientes logados (senão a ação falha em silêncio) */
  canFavorite?: boolean;
}) {
  const priceLabel =
    p.priceMin != null ? `A partir de ${formatMoney(p.priceMin)}` : null;

  return (
    <Link
      href={`/p/${p.slug}`}
      className="card card-hover block p-4"
    >
      <div className="flex items-start gap-3">
        <Avatar name={p.displayName} size={52} className="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-display text-[15px] font-bold text-slate-900">
              {p.displayName}
            </h3>
            {p.verificationLevel !== "NONE" && (
              <BadgeCheck size={16} className="shrink-0 fill-[var(--info)] text-white" />
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Star size={13} className="fill-[var(--accent)] text-[var(--accent)]" />
              <b className="text-slate-700">{p.ratingAvg.toFixed(1).replace(".", ",")}</b>
              <span className="text-slate-400">({p.ratingCount})</span>
            </span>
            {p.distanceKm != null && (
              <span className="inline-flex items-center gap-0.5 text-slate-400">
                <MapPin size={12} />
                {formatDistance(p.distanceKm)}
              </span>
            )}
          </div>
          {p.availableToday && (
            <span className="badge-success mt-1.5 inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              Disponível hoje
            </span>
          )}
        </div>
        {canFavorite && <FavoriteHeart providerId={p.id} initial={favorited} />}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <p className="truncate text-xs text-slate-400">
          {p.matchedService ?? p.headline ?? `${p.completedJobs} serviços concluídos`}
        </p>
        {priceLabel ? (
          <span className="badge shrink-0 bg-[var(--primary-light)] px-3 py-1 font-semibold text-[var(--primary-dark)]">
            {priceLabel}
          </span>
        ) : (
          <span className="badge shrink-0 bg-slate-100 px-3 py-1 font-medium text-slate-500">
            Sob orçamento
          </span>
        )}
      </div>
    </Link>
  );
}
