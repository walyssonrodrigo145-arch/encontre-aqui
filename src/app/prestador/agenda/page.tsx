import { and, asc, eq, gte, ne } from "drizzle-orm";
import { CalendarDays } from "lucide-react";
import { db } from "@/lib/db";
import {
  appointments,
  blockedDates,
  customers,
  providers,
  services,
  users,
} from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { getAvailableSlots } from "@/server/services/availability";
import { addBlockedDateAction, removeBlockedDateAction } from "@/server/actions/provider-onboarding";
import { AppointmentActions } from "@/components/appointment-actions";
import { EmptyState, SectionTitle, StatusBadge } from "@/components/ui";
import { APPOINTMENT_STATUS_LABEL, formatDate, WEEKDAYS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Minha agenda" };

export default async function ProviderAgendaPage() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return null;

  const now = new Date();
  const [rows, slots, blocked] = await Promise.all([
    db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        status: appointments.status,
        addressText: appointments.addressText,
        customerName: users.name,
        serviceName: services.name,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.providerId, provider.id),
          ne(appointments.status, "CANCELLED"),
          gte(appointments.scheduledAt, new Date(now.getFullYear(), now.getMonth(), now.getDate())),
        ),
      )
      .orderBy(asc(appointments.scheduledAt)),
    getAvailableSlots(provider.id, 7),
    db.select().from(blockedDates).where(eq(blockedDates.providerId, provider.id)),
  ]);


  const pending = rows.filter((r) => r.status === "BOOKING_REQUESTED");
  const confirmed = rows.filter((r) => r.status !== "BOOKING_REQUESTED");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Minha agenda</h1>
        <p className="text-sm text-slate-500">Confirme solicitações e gerencie seus horários</p>
      </div>

      {pending.length > 0 && (
        <section>
          <SectionTitle sub="Precisam da sua confirmação">⏳ Solicitações de agendamento</SectionTitle>
          <ul className="space-y-3">
            {pending.map((a) => (
              <li key={a.id} className="card border-amber-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-800">{a.customerName}</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(a.scheduledAt)} {a.serviceName ? `· ${a.serviceName}` : ""}
                    </p>
                    {a.addressText && <p className="text-xs text-slate-400">📍 {a.addressText}</p>}
                  </div>
                  <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABEL[a.status]!} />
                </div>
                <AppointmentActions appointmentId={a.id} status={a.status} role="PROVIDER" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>Confirmados</SectionTitle>
        {confirmed.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={20} />}
            title="Nenhum serviço confirmado"
            description="Seus próximos atendimentos aparecerão aqui."
          />
        ) : (
          <ul className="space-y-3">
            {confirmed.map((a) => (
              <li key={a.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-800">{a.customerName}</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(a.scheduledAt)} {a.serviceName ? `· ${a.serviceName}` : ""}
                    </p>
                    {a.addressText && <p className="text-xs text-slate-400">📍 {a.addressText}</p>}
                  </div>
                  <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABEL[a.status] ?? a.status} />
                </div>
                <AppointmentActions appointmentId={a.id} status={a.status} role="PROVIDER" />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Próximos horários livres */}
      <section>
        <SectionTitle sub="Baseado na sua configuração de disponibilidade">Horários livres (7 dias)</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((d) => {
            const free = d.slots.filter((s) => s.available).length;
            return (
              <div key={d.date} className="card p-3">
                <p className="text-sm font-semibold text-slate-700">
                  {WEEKDAYS[d.weekday]} — {new Date(`${d.date}T12:00:00`).toLocaleDateString("pt-BR")}
                </p>
                <p className="text-xs text-slate-400">{free} horário(s) livre(s)</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bloquear datas */}
      <section>
        <SectionTitle sub="Férias, folgas ou compromissos">Bloquear datas</SectionTitle>
        <div className="card p-4">
          <form
            action={async (fd: FormData) => {
              "use server";
              await addBlockedDateAction(String(fd.get("date")), String(fd.get("reason") ?? "") || undefined);
            }}
            className="flex flex-wrap gap-2"
          >
            <input type="date" name="date" required className="input w-40" />
            <input name="reason" className="input flex-1" placeholder="Motivo (opcional)" />
            <button className="btn-outline">Bloquear</button>
          </form>
          {blocked.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {blocked.map((b) => (
                <li key={b.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-600">
                    {b.date} {b.reason ? `· ${b.reason}` : ""}
                  </span>
                  <form
                    action={async () => {
                      "use server";
                      await removeBlockedDateAction(b.id);
                    }}
                  >
                    <button className="text-xs font-medium text-[var(--danger)]">Liberar</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
