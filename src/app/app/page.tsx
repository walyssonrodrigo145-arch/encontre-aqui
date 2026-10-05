import Link from "next/link";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { CalendarDays, ClipboardList, Heart, Search } from "lucide-react";
import { db } from "@/lib/db";
import { appointments, categories, customers, favorites, providers, quotes } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { APPOINTMENT_STATUS_LABEL, formatDate, QUOTE_STATUS_LABEL } from "@/lib/utils";
import { EmptyState, OrphanProfile, SectionTitle, StatusBadge } from "@/components/ui";
import { ProviderCard } from "@/components/provider-card";
import { FadeIn } from "@/components/motion";
import { searchProviders } from "@/server/services/search";

export const dynamic = "force-dynamic";

export const metadata = { title: "Meu painel" };

export default async function ClientDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const showWelcome = sp.welcome === "1";
  const session = await requireRole("CUSTOMER");
  const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
  if (!customer) {
    return <OrphanProfile message="Não encontramos o seu perfil de cliente." ctaHref="/perfil" ctaLabel="Ir para o perfil" />;
  }

  const [upcoming, recentQuotes, favCount, suggestions, categoryRows] = await Promise.all([
    db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        status: appointments.status,
        providerName: providers.displayName,
        providerSlug: providers.slug,
      })
      .from(appointments)
      .innerJoin(providers, eq(appointments.providerId, providers.id))
      .where(
        and(
          eq(appointments.customerId, customer.id),
          ne(appointments.status, "CANCELLED"),
          ne(appointments.status, "COMPLETED"),
        ),
      )
      .orderBy(appointments.scheduledAt)
      .limit(3),
    db
      .select({
        id: quotes.id,
        description: quotes.description,
        status: quotes.status,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .where(eq(quotes.customerId, customer.id))
      .orderBy(desc(quotes.createdAt))
      .limit(3),
    db
      .select({ id: favorites.id })
      .from(favorites)
      .where(eq(favorites.customerId, customer.id)),
    searchProviders({ lat: customer.lat ?? undefined, lng: customer.lng ?? undefined }),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
  ]);

  return (
    <div className="space-y-6">
      {/* Boas-vindas pós-cadastro */}
      {showWelcome && (
        <FadeIn>
          <div className="card relative overflow-hidden border-[var(--primary)]/30 bg-gradient-to-r from-[var(--primary-soft)] to-white p-5">
            <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[var(--primary)]/10 blur-2xl" />
            <p className="font-display text-lg font-extrabold text-slate-900">
              👋 Bem-vindo ao Encontre Aqui!
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              Encontre profissionais qualificados perto de você. Use a busca abaixo para começar.
            </p>
          </div>
        </FadeIn>
      )}

      {/* Busca rápida */}
      <section className="card bg-gradient-to-r from-[var(--primary-light)]/70 to-white p-5">
        <h1 className="font-display text-xl font-extrabold text-slate-900">Olá, {session.name.split(" ")[0]}! 👋</h1>
        <p className="text-sm text-slate-600">O que você precisa hoje?</p>
        <form action="/busca" className="mt-3 flex gap-2">
          <input
            name="q"
            placeholder="Ex: eletricista, encanador, diarista..."
            className="input flex-1"
            aria-label="Buscar serviço"
          />
          <button className="btn-gradient shrink-0">
            <Search size={16} />
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </form>
      </section>

      {/* Categorias rápidas */}
      <section>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {categoryRows.map((c) => (
            <Link
              key={c.id}
              href={`/busca?categoria=${c.id}`}
              className="shrink-0 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-[var(--primary)]/50 hover:text-[var(--primary)]"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Próximos serviços */}
        <section className="card p-5">
          <SectionTitle>Próximos serviços</SectionTitle>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={20} />}
              title="Nenhum serviço agendado"
              description="Encontre um profissional e agende seu próximo serviço."
              action={
                <Link href="/busca" className="btn-primary">
                  Buscar profissional
                </Link>
              }
            />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 transition hover:bg-slate-100">
                  <div className="min-w-0">
                    <Link href={`/p/${a.providerSlug}`} className="block truncate text-sm font-semibold text-slate-700 hover:text-[var(--primary)]">
                      {a.providerName}
                    </Link>
                    <p className="text-xs text-slate-500">{formatDate(a.scheduledAt)}</p>
                  </div>
                  <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABEL[a.status] ?? a.status} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/app/agendamentos" className="btn-ghost mt-3 w-full">Ver todos</Link>
        </section>

        {/* Orçamentos */}
        <section className="card p-5">
          <SectionTitle>Últimas solicitações</SectionTitle>
          {recentQuotes.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={20} />}
              title="Nenhuma solicitação ainda"
              description="Solicite orçamentos sem compromisso para os serviços que precisa."
            />
          ) : (
            <ul className="space-y-2">
              {recentQuotes.map((q) => (
                <li key={q.id}>
                  <Link href={`/app/orcamentos/${q.id}`} className="block rounded-xl bg-slate-50 px-3 py-2.5 transition hover:bg-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-700">{q.description}</p>
                      <StatusBadge status={q.status} label={QUOTE_STATUS_LABEL[q.status] ?? q.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{formatDate(q.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/app/solicitacoes" className="btn-ghost mt-3 w-full">Ver todas</Link>
        </section>
      </div>

      {/* Sugestões */}
      <section>
        <SectionTitle sub="Bem avaliados e perto de você">Sugestões para você</SectionTitle>
        {suggestions.length === 0 ? (
          <EmptyState icon={<Search size={20} />} title="Nenhum profissional na sua região ainda" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {suggestions.slice(0, 4).map((p) => (
              <ProviderCard key={p.id} p={p} canFavorite />
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
        <Heart size={14} /> {favCount.length} profissional(is) favoritado(s)
      </div>
    </div>
  );
}
