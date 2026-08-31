import Link from "next/link";
import { ArrowLeft, SearchX, SlidersHorizontal, Zap, BadgeCheck, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { categories, customers, favorites } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { searchProviders } from "@/server/services/search";
import { Navbar, Footer, MobileTabBar, TabBarSpacer } from "@/components/navbar";
import { ProviderCard } from "@/components/provider-card";
import { EmptyState } from "@/components/ui";
import { getVerifiedSession } from "@/lib/auth";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = { title: "Buscar profissionais" };
export const dynamic = "force-dynamic";

function num(v: string | string[] | undefined): number | undefined {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
function str(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

export default async function BuscaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const session = await getVerifiedSession();

  const query = str(sp.q);
  const categoryId = num(sp.categoria);
  const lat = sp.lat != null ? Number(str(sp.lat)) : undefined;
  const lng = sp.lng != null ? Number(str(sp.lng)) : undefined;
  const maxDistanceKm = num(sp.distancia);
  const minRating = num(sp.nota);
  const emergencyOnly = str(sp.emergencia) === "1";
  const verifiedOnly = str(sp.verificado) === "1";
  const city = str(sp.onde);
  const sortParam = str(sp.ordem);
  const sort = sortParam === "distance" || sortParam === "rating" ? sortParam : "relevance";

  const [cats, results, favIds] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    searchProviders({
      query,
      city,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
      categoryId,
      maxDistanceKm,
      minRating,
      emergencyOnly,
      verifiedOnly,
      sort,
    }),
    session?.role === "CUSTOMER"
      ? db
          .select({ providerId: favorites.providerId })
          .from(favorites)
          .innerJoin(customers, eq(favorites.customerId, customers.id))
          .where(eq(customers.userId, session.userId))
      : Promise.resolve([] as { providerId: number }[]),
  ]);
  const favSet = new Set(favIds.map((f) => f.providerId));

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = {
      q: query,
      categoria: categoryId?.toString(),
      distancia: maxDistanceKm?.toString(),
      nota: minRating?.toString(),
      emergencia: emergencyOnly ? "1" : undefined,
      verificado: verifiedOnly ? "1" : undefined,
      ordem: sortParam,
      ...patch,
    };
    for (const [k, v] of Object.entries(current)) if (v) params.set(k, v);
    return `/busca?${params.toString()}`;
  };

  const chip = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
      active
        ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/25"
        : "border-[var(--border)] bg-white text-slate-600 hover:border-[var(--primary)]/40"
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header gradiente (mobile) */}
      <div className="bg-brand-gradient px-4 pb-4 pt-5 md:hidden">
        <div className="flex items-center gap-2 text-white">
          <Link href="/" className="rounded-full p-1.5 transition hover:bg-white/15" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <h1 className="font-display truncate text-lg font-bold">
              {query ?? "Buscar profissionais"}
            </h1>
            <p className="text-xs text-white/70">{city ?? "Sua região"}</p>
          </div>
        </div>
      </div>

      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 md:py-6">
        {/* Barra de busca (desktop) */}
        <form action="/busca" className="card hidden gap-2 p-2 md:flex">
          <input
            name="q"
            defaultValue={query}
            placeholder="Qual serviço você procura?"
            className="input border-0 bg-transparent focus:ring-0"
            aria-label="Serviço"
          />
          <div className="flex w-56 items-center gap-2 rounded-xl bg-slate-50 px-3">
            <MapPin size={16} className="shrink-0 text-slate-400" />
            <input
              name="onde"
              defaultValue={city}
              placeholder="Onde? Ex: Teófilo Otoni"
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
              aria-label="Onde"
            />
          </div>
          {categoryId && <input type="hidden" name="categoria" value={categoryId} />}
          <button className="btn-gradient shrink-0">Buscar</button>
        </form>

        {/* Chips de filtro */}
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:mt-4 md:flex-wrap md:px-0">
          <SlidersHorizontal size={15} className="mt-2 hidden shrink-0 text-slate-400 md:block" />
          <Link href={buildHref({ categoria: undefined })} className={chip(!categoryId)}>
            Todos
          </Link>
          {cats.map((c) => (
            <Link key={c.id} href={buildHref({ categoria: c.id.toString() })} className={chip(categoryId === c.id)}>
              {c.name}
            </Link>
          ))}
          <Link href={buildHref({ emergencia: emergencyOnly ? undefined : "1" })} className={chip(emergencyOnly)}>
            <Zap size={13} className={emergencyOnly ? "" : "text-[var(--accent)]"} /> Emergência
          </Link>
          <Link href={buildHref({ verificado: verifiedOnly ? undefined : "1" })} className={chip(verifiedOnly)}>
            <BadgeCheck size={13} /> Verificados
          </Link>
          <span className="mx-0.5 my-1 w-px shrink-0 bg-[var(--border)] md:hidden" />
          <Link href={buildHref({ ordem: sort === "rating" ? undefined : "rating" })} className={chip(sort === "rating")}>
            ★ Mais bem avaliados
          </Link>
        </div>

        {/* Contagem */}
        <p className="mt-3 text-sm text-slate-500">
          {results.length > 0 ? (
            <>
              <b className="font-display text-slate-800">{results.length}</b> profissional(is) encontrado(s)
              {query ? (
                <>
                  {" "}para <b className="text-slate-700">&quot;{query}&quot;</b>
                </>
              ) : null}
            </>
          ) : null}
        </p>

        {/* Resultados */}
        <div className="mt-3 pb-4">
          {results.length === 0 ? (
            <EmptyState
              icon={<SearchX size={22} />}
              title="Nenhum profissional encontrado"
              description={
                query
                  ? `Não encontramos prestadores para "${query}" com esses filtros. Tente remover alguns filtros ou buscar outro termo.`
                  : "Ainda não há prestadores cadastrados com esses filtros. Tente ampliar sua busca."
              }
              action={
                <Link href="/busca" className="btn-gradient">
                  Limpar filtros
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {results.map((p) => (
                <ProviderCard
                  key={p.id}
                  p={p}
                  favorited={favSet.has(p.id)}
                  canFavorite={session?.role === "CUSTOMER"}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <TabBarSpacer />
      <MobileTabBar />
    </div>
  );
}

