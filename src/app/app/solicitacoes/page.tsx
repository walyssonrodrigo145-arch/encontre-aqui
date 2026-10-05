import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ClipboardList } from "lucide-react";
import { db } from "@/lib/db";
import { customers, providers, quotes } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { formatDate, QUOTE_STATUS_LABEL } from "@/lib/utils";
import { EmptyState, OrphanProfile, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Minhas solicitações" };

export default async function ClientQuotesPage() {
  const session = await requireRole("CUSTOMER");
  const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
  if (!customer) {
    return <OrphanProfile message="Não encontramos o seu perfil de cliente." ctaHref="/perfil" ctaLabel="Ir para o perfil" />;
  }

  const rows = await db
    .select({
      id: quotes.id,
      description: quotes.description,
      urgency: quotes.urgency,
      status: quotes.status,
      createdAt: quotes.createdAt,
      providerName: providers.displayName,
      providerSlug: providers.slug,
    })
    .from(quotes)
    .innerJoin(providers, eq(quotes.providerId, providers.id))
    .where(eq(quotes.customerId, customer.id))
    .orderBy(desc(quotes.createdAt));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-slate-900">Minhas solicitações</h1>
      <p className="mb-5 text-sm text-slate-500">Acompanhe orçamentos solicitados aos profissionais</p>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={20} />}
          title="Você ainda não solicitou orçamentos"
          description="Encontre um profissional e solicite um orçamento sem compromisso."
          action={<Link href="/busca" className="btn-primary">Buscar profissionais</Link>}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((q) => (
            <li key={q.id}>
              <Link href={`/app/orcamentos/${q.id}`} className="card block p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--primary)]/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700">{q.providerName}</span>
                  <StatusBadge status={q.status} label={QUOTE_STATUS_LABEL[q.status] ?? q.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{q.description}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>{formatDate(q.createdAt)}</span>
                  {q.urgency === "EMERGENCY" && <span className="badge bg-red-100 text-red-700">🚨 Emergência</span>}
                  {q.urgency === "URGENT" && <span className="badge bg-amber-100 text-amber-700">Urgente</span>}
                  <span className="font-semibold text-[var(--primary)]">Ver orçamentos →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
