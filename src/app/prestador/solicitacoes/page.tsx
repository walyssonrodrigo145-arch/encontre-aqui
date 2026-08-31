import Link from "next/link";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { ArrowLeft, ArrowRight, ClipboardList } from "lucide-react";
import { db } from "@/lib/db";
import { customers, providers, quoteResponses, quotes, users } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney, QUOTE_URGENCY_LABEL } from "@/lib/utils";
import { EmptyState, SectionTitle, StatusBadge } from "@/components/ui";
import { RespondQuoteForm } from "@/components/respond-quote-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Solicitações" };

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProviderQuotesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const pageRaw = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return null;

  const answeredFilter = and(eq(quotes.providerId, provider.id), ne(quotes.status, "OPEN"));

  const [openQuotes, answeredQuotes, totalRow] = await Promise.all([
    db
      .select({
        quote: quotes,
        customerName: users.name,
      })
      .from(quotes)
      .innerJoin(customers, eq(quotes.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .where(and(eq(quotes.providerId, provider.id), eq(quotes.status, "OPEN")))
      .orderBy(desc(quotes.createdAt)),
    db
      .select({
        quote: quotes,
        customerName: users.name,
        response: quoteResponses,
      })
      .from(quotes)
      .innerJoin(customers, eq(quotes.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .leftJoin(quoteResponses, eq(quoteResponses.quoteId, quotes.id))
      .where(answeredFilter)
      .orderBy(desc(quotes.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ c: sql<number>`count(*)` }).from(quotes).where(answeredFilter),
  ]);

  const totalAnswered = Number(totalRow[0]?.c ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalAnswered / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Solicitações de orçamento</h1>
        <p className="text-sm text-slate-500">Responda rápido para aumentar sua taxa de conversão</p>
      </div>

      <section>
        <SectionTitle sub={`${openQuotes.length} aguardando resposta`}>📥 Novas solicitações</SectionTitle>
        {openQuotes.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={20} />}
            title="Nenhuma solicitação aberta"
            description="Complete seu perfil e impulsione para aparecer mais nas buscas."
            action={<Link href="/prestador/impulsionar" className="btn-primary">🚀 Impulsionar perfil</Link>}
          />
        ) : (
          <ul className="space-y-3">
            {openQuotes.map(({ quote, customerName }) => (
              <li
                key={quote.id}
                className="card card-hover border-l-[3px] border-l-[var(--primary)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-800">{customerName}</p>
                  <div className="flex gap-1.5">
                    {quote.urgency === "EMERGENCY" && <span className="badge bg-red-100 text-red-700">🚨 Emergência</span>}
                    {quote.urgency === "URGENT" && <span className="badge bg-amber-100 text-amber-700">Urgente</span>}
                    {quote.urgency === "NORMAL" && <span className="badge bg-slate-100 text-slate-500">{QUOTE_URGENCY_LABEL[quote.urgency]}</span>}
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{quote.description}</p>
                <p className="mt-1 text-xs text-slate-400">
                  📅 Desejado: {quote.desiredDate ?? "flexível"} · 📌 {quote.addressText} · {formatDate(quote.createdAt)}
                </p>
                <RespondQuoteForm quoteId={quote.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {answeredQuotes.length > 0 && (
        <section>
          <SectionTitle>Histórico ({totalAnswered})</SectionTitle>
          <ul className="space-y-2">
            {answeredQuotes.map(({ quote, customerName, response }) => (
              <li key={`${quote.id}-${response?.id ?? 0}`} className="card flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{customerName}</p>
                  <p className="truncate text-xs text-slate-400">{quote.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {response && (
                    <span className="text-sm font-bold text-slate-700">{formatMoney(response.price)}</span>
                  )}
                  <StatusBadge
                    status={quote.status}
                    label={quote.status === "ACCEPTED" ? "Aceito ✅" : quote.status === "ANSWERED" ? "Aguardando cliente" : "Encerrado"}
                  />
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              {page > 1 ? (
                <Link href={`/prestador/solicitacoes?page=${page - 1}`} className="btn-outline px-4 py-2 text-xs">
                  <ArrowLeft size={13} /> Anterior
                </Link>
              ) : (
                <span className="btn-outline pointer-events-none px-4 py-2 text-xs opacity-50">
                  <ArrowLeft size={13} /> Anterior
                </span>
              )}
              <span className="text-xs text-slate-500">
                Página {page} de {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={`/prestador/solicitacoes?page=${page + 1}`} className="btn-outline px-4 py-2 text-xs">
                  Próxima <ArrowRight size={13} />
                </Link>
              ) : (
                <span className="btn-outline pointer-events-none px-4 py-2 text-xs opacity-50">
                  Próxima <ArrowRight size={13} />
                </span>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

