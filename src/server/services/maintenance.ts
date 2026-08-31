import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, customers, notifications, providers } from "@/lib/schema";

/** Solicitações de agendamento pendentes expiram após 24h sem resposta. */
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

/** Cancela solicitações BOOKING_REQUESTED esquecidas e notifica as partes. */
export async function expireStaleBookingRequests(): Promise<number> {
  const cutoff = new Date(Date.now() - PENDING_TTL_MS);

  const stale = await db
    .select({
      id: appointments.id,
      customerUserId: customers.userId,
      providerUserId: providers.userId,
    })
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .innerJoin(providers, eq(appointments.providerId, providers.id))
    .where(and(eq(appointments.status, "BOOKING_REQUESTED"), lt(appointments.createdAt, cutoff)));

  let count = 0;
  for (const row of stale) {
    const res = await db
      .update(appointments)
      .set({
        status: "CANCELLED",
        cancelledBy: "ADMIN",
        cancellationReason: "Expirada: sem resposta em 24h",
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.id, row.id), eq(appointments.status, "BOOKING_REQUESTED")));

    const changed = (res as unknown as { rowsAffected?: number }).rowsAffected ?? 0;
    if (changed === 0) continue;
    count++;

    await db.insert(notifications).values({
      userId: row.customerUserId,
      type: "BOOKING_EXPIRED",
      title: "Solicitação de agendamento expirada",
      body: "Sua solicitação foi cancelada automaticamente por ficar 24h sem resposta do profissional.",
      link: "/app/agendamentos",
      referenceType: "APPOINTMENT",
      referenceId: row.id,
    });
    await db.insert(notifications).values({
      userId: row.providerUserId,
      type: "BOOKING_EXPIRED",
      title: "Solicitação de agendamento expirada",
      body: "Uma solicitação pendente foi cancelada automaticamente por ficar 24h sem resposta.",
      link: "/prestador/agenda",
      referenceType: "APPOINTMENT",
      referenceId: row.id,
    });
  }
  return count;
}
