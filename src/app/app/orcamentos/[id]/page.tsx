import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CalendarPlus, CheckCircle2, Clock, FileText, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { customers, providers, quoteResponses, quotes, services, users } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney, QUOTE_URGENCY_LABEL } from "@/lib/utils";
import { Navbar, Footer } from "@/components/navbar";
import { StatusBadge } from "@/components/ui";
import { acceptQuoteAction } from "@/server/actions/quotes";

export const metadata = { title: "Orçamentos recebidos" };

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quoteId = Number(id);
  if (!Number.isFinite(quoteId)) notFound();

  const session = await requireRole("CUSTOMER");
  const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
  if (!customer) notFound();

  const [row] = await db
    .select({
      quote: quotes,
      providerName: providers.displayName,
      providerSlug: providers.slug,
      providerUserId: providers.userId,
      serviceName: services.name,
    })
    .from(quotes)
    .innerJoin(providers, eq(quotes.providerId, providers.id))
    .innerJoin(users, eq(providers.userId, users.id))
    .leftJoin(services, eq(quotes.serviceId, services.id))
    .where(and(eq(quotes.id, quoteId), eq(quotes.customerId, customer.id)))
    .limit(1);

  if (!row) notFound();

  const responses = await db
    .select()
    .from(quoteResponses)
    .where(eq(quoteResponses.quoteId, quoteId))
    .orderBy(quoteResponses.price);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Link href="/app/solicitacoes" className="text-sm text-slate-500 hover:text-[var(--primary)]">
          ← Voltar
        </Link>

        <div className="card mt-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-bold text-slate-800">Solicitação #{row.quote.id}</h1>
            <StatusBadge status={row.quote.status} label={row.quote.status} />
          </div>
          <p className="mt-2 text-sm text-slate-600">{row.quote.description}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
            <span>📌 {row.quote.addressText}</span>
            <span>⚡ {QUOTE_URGENCY_LABEL[row.quote.urgency]}</span>
            {row.quote.desiredDate && <span>📅 Desejado: {row.quote.desiredDate}</span>}
            {row.serviceName && <span>🔧 {row.serviceName}</span>}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Profissional:{" "}
            <Link href={`/p/${row.providerSlug}`} className="font-semibold text-[var(--primary)]">
              {row.providerName}
            </Link>
          </p>
        </div>

        <h2 className="mb-3 mt-6 text-lg font-bold text-slate-800">
          {responses.length > 0 ? "Propostas recebidas" : "Aguardando resposta do profissional"}
        </h2>

        {responses.length === 0 && (
          <div className="card flex items-center gap-3 p-5 text-sm text-slate-500">
            <Clock size={18} className="shrink-0 text-slate-300" />
            <p>
              O profissional foi notificado. Enquanto espera, que tal solicitar orçamentos de outros
              profissionais para comparar?
            </p>
          </div>
        )}

        <div className="space-y-3">
          {responses.map((r) => {
            const accepted = r.status === "ACCEPTED";
            const rejected = r.status === "REJECTED";
            return (
              <div key={r.id} className={`card p-5 ${accepted ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-2xl font-extrabold text-slate-900">{formatMoney(r.price)}</p>
                    {r.estimatedDays != null && (
                      <p className="text-xs text-slate-500">⏱ Prazo estimado: {r.estimatedDays} dia(s)</p>
                    )}
                  </div>
                  {accepted && (
                    <span className="badge bg-emerald-100 text-emerald-700">
                      <CheckCircle2 size={13} /> Aceito
                    </span>
                  )}
                  {rejected && <span className="badge bg-slate-100 text-slate-500">Não selecionada</span>}
                </div>
                {r.note && <p className="mt-2 text-sm text-slate-600">{r.note}</p>}
                <p className="mt-1 text-xs text-slate-400">Enviado em {formatDate(r.createdAt)}</p>

                {row.quote.status === "ANSWERED" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form
                      action={async () => {
                        "use server";
                        await acceptQuoteAction(quoteId, r.id);
                      }}
                    >
                      <button className="btn-primary">
                        <CheckCircle2 size={15} /> Aceitar proposta
                      </button>
                    </form>
                    <Link href={`/agendar?prestador=${row.quote.providerId}&orcamento=${row.quote.id}&resposta=${r.id}`} className="btn-outline">
                      <CalendarPlus size={15} /> Agendar com esta proposta
                    </Link>
                    <Link href={`/mensagens?prestador=${row.quote.providerId}`} className="btn-outline">
                      <MessageCircle size={15} /> Conversar
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {row.quote.status === "ACCEPTED" && (
          <div className="mt-6 rounded-2xl bg-[var(--primary-light)] p-4 text-sm text-[var(--primary-dark)]">
            <p className="flex items-center gap-2 font-semibold">
              <FileText size={16} /> Proposta aceita!
            </p>
            <p className="mt-1">
              Agora agende a data e o horário com o profissional na aba{" "}
              <Link href={`/agendar?prestador=${row.quote.providerId}&orcamento=${row.quote.id}`} className="font-bold underline">
                Agendar serviço
              </Link>
              .
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
