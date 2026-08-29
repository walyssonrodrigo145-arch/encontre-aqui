import Link from "next/link";
import { eq } from "drizzle-orm";
import { BadgeCheck, Heart, MapPin, Star } from "lucide-react";
import { db } from "@/lib/db";
import { customers, favorites, providers } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { EmptyState } from "@/components/ui";
import { FavoriteHeart } from "@/components/favorite-heart";
import { FadeIn } from "@/components/motion";

export const metadata = { title: "Meus favoritos" };
export const dynamic = "force-dynamic";

export default async function FavoritosPage() {
  const session = await requireRole("CUSTOMER");
  const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
  if (!customer) return null;

  const rows = await db
    .select({
      providerId: providers.id,
      displayName: providers.displayName,
      slug: providers.slug,
      headline: providers.headline,
      city: providers.city,
      state: providers.state,
      ratingAvg: providers.ratingAvg,
      ratingCount: providers.ratingCount,
      verificationLevel: providers.verificationLevel,
      completedJobs: providers.completedJobs,
    })
    .from(favorites)
    .innerJoin(providers, eq(favorites.providerId, providers.id))
    .where(eq(favorites.customerId, customer.id));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-extrabold text-slate-900">Meus favoritos ❤️</h2>
          <p className="text-sm text-slate-500">
            {rows.length > 0 ? `${rows.length} profissional(is) salvos` : "Profissionais que você salvou aparecem aqui"}
          </p>
        </div>
        <Link href="/busca" className="btn-outline hidden text-xs sm:inline-flex">
          Explorar
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Heart size={20} />}
          title="Nenhum favorito ainda"
          description="Toque no coração no perfil de um profissional para salvá-lo aqui."
          action={<Link href="/busca" className="btn-gradient">Explorar profissionais</Link>}
        />
      ) : (
        <FadeIn>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map((p) => (
              <li key={p.providerId} className="card card-hover relative p-4">
                <div className="absolute right-3 top-3">
                  <FavoriteHeart providerId={p.providerId} initial />
                </div>
                <Link href={`/p/${p.slug}`} className="block pr-11">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-display font-bold text-slate-900">{p.displayName}</p>
                    {p.verificationLevel !== "NONE" && (
                      <BadgeCheck size={15} className="shrink-0 fill-[var(--info)] text-white" />
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{p.headline}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Star size={12} className="fill-[var(--accent)] text-[var(--accent)]" />
                      <b className="text-slate-600">{p.ratingAvg.toFixed(1).replace(".", ",")}</b>({p.ratingCount})
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin size={11} /> {p.city} - {p.state}
                    </span>
                    <span>{p.completedJobs} serviços</span>
                  </div>
                </Link>
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <Link href={`/p/${p.slug}`} className="btn-primary flex-1 py-2 text-xs">
                    Ver perfil
                  </Link>
                  <Link href={`/mensagens?prestador=${p.providerId}`} className="btn-outline py-2 text-xs">
                    Mensagem
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </FadeIn>
      )}
    </div>
  );
}
