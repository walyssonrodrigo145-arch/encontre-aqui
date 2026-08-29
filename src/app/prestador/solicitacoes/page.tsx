import Link from "next/link";
import { and, desc, eq, ne } from "drizzle-orm";
import { ClipboardList } from "lucide-react";
import { db } from "@/lib/db";
import { customers, providers, quoteResponses, quotes, users } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney, QUOTE_URGENCY_LABEL } from "@/lib/utils";
import { EmptyState, SectionTitle, StatusBadge } from "@/components/ui";
import { RespondQuoteForm } from "@/components/respond-quote-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Solicitações" };

export default async function ProviderQuotesPage() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return null;

  const [openQuotes, answeredQuotes] = await Promise.all([
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
      .where(and(eq(quotes.providerId, provider.id), ne(quotes.status, "OPEN")))
      .orderBy(desc(quotes.createdAt))
      .limit(20),
  ]);

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
              <li key={quote.id} className="card p-4">
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
          <SectionTitle>Histórico</SectionTitle>
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
                    label={quote.status === "ACCEPTED" ? "Aceito ✅" : quote.status === "ANSWERED" ? "Aguardando cliente" : quote.status}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

