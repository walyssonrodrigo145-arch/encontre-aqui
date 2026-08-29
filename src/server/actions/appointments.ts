"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { appointments, customers, providers, quoteResponses, quotes } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { isSlotAvailable } from "@/server/services/availability";
import { notify } from "@/server/services/notifications";
import { bookingSchema } from "@/lib/validations";
import { APPOINTMENT_STATUS_LABEL, formatDate } from "@/lib/utils";

export interface BookingState {
  error?: string;
  success?: string;
  appointmentId?: number;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  BOOKING_REQUESTED: ["BOOKING_CONFIRMED", "CANCELLED", "RESCHEDULE_PROPOSED"],
  RESCHEDULE_PROPOSED: ["BOOKING_CONFIRMED", "CANCELLED"],
  BOOKING_CONFIRMED: ["ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
  ON_THE_WAY: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function requestBookingAction(
  _prev: BookingState | undefined,
  formData: FormData,
): Promise<BookingState> {
  const session = await requireRole("CUSTOMER").catch(() => null);
  if (!session) return { error: "Entre com uma conta de cliente para agendar." };

  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  const parsed = bookingSchema.safeParse({
    providerId: Number(formData.get("providerId")),
    serviceId: formData.get("serviceId") ? Number(formData.get("serviceId")) : undefined,
    quoteId: formData.get("quoteId") ? Number(formData.get("quoteId")) : undefined,
    quoteResponseId: formData.get("quoteResponseId") ? Number(formData.get("quoteResponseId")) : undefined,
    scheduledAt: scheduledAtRaw,
    addressText: formData.get("addressText"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return { error: "Data inválida." };
  if (scheduledAt.getTime() < Date.now()) return { error: "Escolha uma data futura." };

  const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
  if (!customer) return { error: "Perfil de cliente não encontrado." };

  const [provider] = await db.select().from(providers).where(eq(providers.id, parsed.data.providerId)).limit(1);
  if (!provider || provider.status !== "APPROVED") return { error: "Profissional indisponível." };

  // IDOR: orçamento/resposta informados devem pertencer a este cliente e prestador
  let quoteId = parsed.data.quoteId;
  const quoteResponseId = parsed.data.quoteResponseId;
  if (quoteResponseId != null) {
    const [qr] = await db
      .select({ id: quoteResponses.id, quoteId: quoteResponses.quoteId })
      .from(quoteResponses)
      .where(eq(quoteResponses.id, quoteResponseId))
      .limit(1);
    if (!qr) return { error: "Proposta inválida." };
    quoteId = qr.quoteId;
  }
  if (quoteId != null) {
    const [q] = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(
        and(
          eq(quotes.id, quoteId),
          eq(quotes.customerId, customer.id),
          eq(quotes.providerId, provider.id),
        ),
      )
      .limit(1);
    if (!q) return { error: "Orçamento inválido." };
  }

  const available = await isSlotAvailable(provider.id, scheduledAt);
  if (!available) return { error: "Este horário não está mais disponível. Escolha outro." };

  const [appointment] = await db
    .insert(appointments)
    .values({
      customerId: customer.id,
      providerId: provider.id,
      quoteId,
      quoteResponseId,
      serviceId: parsed.data.serviceId,
      scheduledAt,
      addressText: parsed.data.addressText,
      status: "BOOKING_REQUESTED",
    })
    .returning();

  await notify({
    userId: provider.userId,
    type: "BOOKING_REQUESTED",
    title: "Novo agendamento solicitado",
    body: `${formatDate(scheduledAt)} — aguarde sua confirmação`,
    link: "/prestador/agenda",
    referenceType: "APPOINTMENT",
    referenceId: appointment!.id,
  });

  revalidatePath("/app/agendamentos");
  return {
    success: `Solicitação enviada para ${formatDate(scheduledAt)}! Você será notificado na confirmação.`,
    appointmentId: appointment!.id,
  };
}

export async function updateAppointmentStatusAction(
  appointmentId: number,
  newStatus: string,
  options?: { proposedAt?: Date; reason?: string },
): Promise<{ error?: string }> {
  let session = await requireRole("PROVIDER").catch(() => null);
  if (!session) session = await requireRole("CUSTOMER").catch(() => null);
  if (!session) return { error: "Acesso negado." };

  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
  if (!appointment) return { error: "Agendamento não encontrado." };

  // autorização: só as partes envolvidas
  let authorized = false;
  let counterpartUserId: number | null = null;
  if (session.role === "PROVIDER") {
    const [p] = await db.select({ id: providers.id, userId: providers.userId }).from(providers).where(eq(providers.userId, session.userId)).limit(1);
    authorized = !!p && p.id === appointment.providerId;
    const [c] = await db.select({ userId: customers.userId }).from(customers).where(eq(customers.id, appointment.customerId)).limit(1);
    counterpartUserId = c?.userId ?? null;
  } else {
    const [c] = await db.select({ id: customers.id, userId: customers.userId }).from(customers).where(eq(customers.userId, session.userId)).limit(1);
    authorized = !!c && c.id === appointment.customerId;
    const [p] = await db.select({ userId: providers.userId }).from(providers).where(eq(providers.id, appointment.providerId)).limit(1);
    counterpartUserId = p?.userId ?? null;
  }
  if (!authorized) return { error: "Acesso negado." };

  if (!canTransition(appointment.status, newStatus)) {
    return { error: `Transição inválida de ${appointment.status} para ${newStatus}.` };
  }

  if (newStatus === "BOOKING_CONFIRMED") {
    // valida novamente o slot no momento da confirmação (excluindo o próprio agendamento)
    const stillAvailable = await isSlotAvailable(
      appointment.providerId,
      appointment.scheduledAt,
      appointment.id,
    );
    if (!stillAvailable) {
      return { error: "Este horário já foi ocupado por outro cliente." };
    }
  }

  await db
    .update(appointments)
    .set({
      status: newStatus as typeof appointments.$inferInsert.status,
      proposedAt: options?.proposedAt,
      cancellationReason: newStatus === "CANCELLED" ? (options?.reason ?? "Sem justificativa") : null,
      cancelledBy: newStatus === "CANCELLED" ? session.role : null,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, appointmentId));

  if (counterpartUserId) {
    await notify({
      userId: counterpartUserId,
      type: `APPT_${newStatus}`,
      title: statusNotifyTitle(newStatus),
      body:
        newStatus === "CANCELLED"
          ? `Motivo: ${options?.reason ?? "não informado"}`
          : formatDate(appointment.scheduledAt),
      link: session.role === "PROVIDER" ? "/app/agendamentos" : "/prestador/agenda",
      referenceType: "APPOINTMENT",
      referenceId: appointmentId,
    });
  }

  // incrementa contador de serviços concluídos
  if (newStatus === "COMPLETED") {
    const [p] = await db
      .select({ completedJobs: providers.completedJobs })
      .from(providers)
      .where(eq(providers.id, appointment.providerId))
      .limit(1);
    await db
      .update(providers)
      .set({ completedJobs: (p?.completedJobs ?? 0) + 1 })
      .where(eq(providers.id, appointment.providerId));
  }

  revalidatePath("/prestador/agenda");
  revalidatePath("/app/agendamentos");
  return {};
}

function statusNotifyTitle(status: string): string {
  switch (status) {
    case "BOOKING_CONFIRMED": return "Agendamento confirmado ✅";
    case "ON_THE_WAY": return "Profissional a caminho 🚗";
    case "IN_PROGRESS": return "Serviço iniciado 🔧";
    case "COMPLETED": return "Serviço concluído ✔️ — avalie!";
    case "CANCELLED": return "Agendamento cancelado";
    case "RESCHEDULE_PROPOSED": return "Sugestão de novo horário";
    default: return `Status: ${APPOINTMENT_STATUS_LABEL[status] ?? status}`;
  }
}

export async function cancelAppointmentAction(
  appointmentId: number,
  reason: string,
) {
  return updateAppointmentStatusAction(appointmentId, "CANCELLED", { reason });
}
