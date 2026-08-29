import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { CalendarDays, Star } from "lucide-react";
import { db } from "@/lib/db";
import { appointments, customers, providers, services } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { APPOINTMENT_STATUS_LABEL, formatDate } from "@/lib/utils";
import { EmptyState, StatusBadge } from "@/components/ui";
import { AppointmentActions } from "@/components/appointment-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Meus agendamentos" };

export default async function ClientAppointmentsPage() {
  const session = await requireRole("CUSTOMER");
  const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
  if (!customer) return null;

  const rows = await db
    .select({
      id: appointments.id,
      scheduledAt: appointments.scheduledAt,
      status: appointments.status,
      addressText: appointments.addressText,
      isReviewed: appointments.isReviewed,
      providerName: providers.displayName,
      providerSlug: providers.slug,
      providerId: providers.id,
      serviceName: services.name,
    })
    .from(appointments)
    .innerJoin(providers, eq(appointments.providerId, providers.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(and(eq(appointments.customerId, customer.id)))
    .orderBy(desc(appointments.scheduledAt));

  const active = rows.filter((r) => !["COMPLETED", "CANCELLED"].includes(r.status));
  const history = rows.filter((r) => ["COMPLETED", "CANCELLED"].includes(r.status));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-extrabold text-slate-900">Meus agendamentos</h1>
        <p className="text-sm text-slate-500">Acompanhe o status dos seus serviços</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Ativos</h2>
        {active.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={20} />}
            title="Nenhum serviço ativo"
            description="Agende um serviço com um profissional da sua região."
            action={<Link href="/busca" className="btn-primary">Buscar profissionais</Link>}
          />
        ) : (
          <ul className="space-y-3">
            {active.map((a) => (
              <li key={a.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/p/${a.providerSlug}`} className="font-bold text-slate-800 hover:text-[var(--primary)]">
                      {a.providerName}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {formatDate(a.scheduledAt)} {a.serviceName ? `· ${a.serviceName}` : ""}
                    </p>
                    {a.addressText && <p className="text-xs text-slate-400">📍 {a.addressText}</p>}
                  </div>
                  <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABEL[a.status] ?? a.status} />
                </div>
                <AppointmentActions appointmentId={a.id} status={a.status} role="CUSTOMER" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Histórico</h2>
          <ul className="space-y-3">
            {history.map((a) => (
              <li key={a.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/p/${a.providerSlug}`} className="font-bold text-slate-700">{a.providerName}</Link>
                    <p className="text-sm text-slate-500">{formatDate(a.scheduledAt)}</p>
                  </div>
                  <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABEL[a.status] ?? a.status} />
                </div>
                {a.status === "COMPLETED" && (
                  <div className="mt-3">
                    {a.isReviewed ? (
                      <p className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Star size={13} className="fill-[var(--accent)] text-[var(--accent)]" /> Serviço avaliado. Obrigado!
                      </p>
                    ) : (
                      <Link href={`/app/avaliar/${a.id}`} className="btn-primary py-2 text-xs">
                        <Star size={14} /> Avaliar serviço
                      </Link>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
