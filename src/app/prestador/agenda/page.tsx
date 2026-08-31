import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  appointments,
  blockedDates,
  customers,
  providerAvailability,
  providers,
  services,
  users,
} from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { getAvailableSlots } from "@/server/services/availability";
import { AgendaWorkspace } from "@/components/agenda-workspace";

export const dynamic = "force-dynamic";

export const metadata = { title: "Minha agenda" };

const PAGE_FROM_WINDOW_DAYS = 30;

/** Carregamento de dados fora do escopo de render (evita impureza no componente). */
async function loadAgenda(providerId: number) {
  const from = new Date(Date.now() - PAGE_FROM_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return Promise.all([
    db
      .select({
        id: appointments.id,
        scheduledAt: appointments.scheduledAt,
        durationMinutes: appointments.durationMinutes,
        status: appointments.status,
        addressText: appointments.addressText,
        customerName: users.name,
        serviceName: services.name,
      })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(and(eq(appointments.providerId, providerId), gte(appointments.scheduledAt, from)))
      .orderBy(asc(appointments.scheduledAt)),
    db
      .select()
      .from(providerAvailability)
      .where(eq(providerAvailability.providerId, providerId)),
    db.select().from(blockedDates).where(eq(blockedDates.providerId, providerId)),
    getAvailableSlots(providerId, 7),
  ]);
}

export default async function ProviderAgendaPage() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return null;

  const [rows, rules, blocked, freeSlots] = await loadAgenda(provider.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Agenda</h1>
        <p className="text-sm text-slate-500">Gerencie seus horários, compromissos e disponibilidade.</p>
      </div>

      <AgendaWorkspace
        slug={provider.slug}
        appointments={rows.map((r) => ({
          id: r.id,
          scheduledAt: r.scheduledAt.toISOString(),
          durationMinutes: r.durationMinutes,
          status: r.status,
          customerName: r.customerName,
          serviceName: r.serviceName,
          addressText: r.addressText,
        }))}
        rules={rules.map((r) => ({
          weekday: r.weekday,
          startTime: r.startTime,
          endTime: r.endTime,
          slotMinutes: r.slotMinutes,
        }))}
        slots={freeSlots}
        blocked={blocked.map((b) => ({ id: b.id, date: b.date, reason: b.reason }))}
      />
    </div>
  );
}
