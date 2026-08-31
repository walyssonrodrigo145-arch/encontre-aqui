"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { appointments, customers, providerServices, providers, quoteResponses, quotes } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { resolveSlot } from "@/server/services/availability";
import { notify } from "@/server/services/notifications";
import { bookingSchema } from "@/lib/validations";
import { APPOINTMENT_STATUS_LABEL, formatDate } from "@/lib/utils";
import { parseBrtLocal } from "@/lib/tz";

export interface BookingState {
  error?: string;
  success?: string;
  appointmentId?: number;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  BOOKING_REQUESTED: ["BOOKING_CONFIRMED", "CANCELLED", "RESCHEDULE_PROPOSED"],
  RESCHEDULE_PROPOSED: ["BOOKING_CONFIRMED", "CANCELLED"],
  BOOKING_CONFIRMED: ["ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RESCHEDULE_PROPOSED"],
  ON_THE_WAY: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Papel autorizado para cada transição (o cliente NÃO avança o fluxo do prestador). */
const ROLE_ALLOWED: Record<"PROVIDER" | "CUSTOMER", Record<string, string[]>> = {
  PROVIDER: {
    BOOKING_REQUESTED: ["BOOKING_CONFIRMED", "CANCELLED", "RESCHEDULE_PROPOSED"],
    RESCHEDULE_PROPOSED: ["CANCELLED"],
    BOOKING_CONFIRMED: ["ON_THE_WAY", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RESCHEDULE_PROPOSED"],
    ON_THE_WAY: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  },
  CUSTOMER: {
    BOOKING_REQUESTED: ["CANCELLED"],
    BOOKING_CONFIRMED: ["CANCELLED"],
    RESCHEDULE_PROPOSED: ["BOOKING_CONFIRMED", "CANCELLED"],
    ON_THE_WAY: ["CANCELLED"],
    IN_PROGRESS: ["CANCELLED"],
  },
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

  // "yyyy-mm-ddTHH:mm" enviado pelo formulário é horário de Brasília
  const scheduledAt = parseBrtLocal(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return { error: "Data inválida." };
  if (scheduledAt.getTime() < Date.now()) return { error: "Escolha uma data futura." };

  const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
  if (!customer) return { error: "Perfil de cliente não encontrado." };

  const [provider] = await db.select().from(providers).where(eq(providers.id, parsed.data.providerId)).limit(1);
  if (!provider || provider.status !== "APPROVED") return { error: "Profissional indisponível." };

  // integridade: o serviço informado deve pertencer ao catálogo DO prestador alvo
  if (parsed.data.serviceId != null) {
    const [svc] = await db
      .select({ id: providerServices.id })
      .from(providerServices)
      .where(and(eq(providerServices.providerId, provider.id), eq(providerServices.serviceId, parsed.data.serviceId)))
      .limit(1);
    if (!svc) return { error: "Este serviço não é oferecido pelo profissional." };
  }

  // anti-spam: máximo de solicitações pendentes por cliente
  const pendingCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [pendingRow] = await db
    .select({ c: sql<number>`count(*)` })
    .from(appointments)
    .where(
      and(
        eq(appointments.customerId, customer.id),
        eq(appointments.status, "BOOKING_REQUESTED"),
        gte(appointments.createdAt, pendingCutoff),
      ),
    );
  if (Number(pendingRow?.c ?? 0) >= 5) {
    return { error: "Você já tem 5 solicitações pendentes. Aguarde respostas ou cancele alguma antes de pedir outra." };
  }

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

  // transação: validação do slot + insert são atômicos (evita double-booking)
  let appointmentId: number | undefined;
  let slotError: string | undefined;
  await db.transaction(async (tx) => {
    const slot = await resolveSlot(tx, provider.id, scheduledAt);
    if (!slot.ok) {
      slotError = slot.reason === "data_bloqueada"
        ? "O profissional bloqueou esta data. Escolha outro dia."
        : slot.reason === "no_passado"
          ? "Escolha uma data futura."
          : "Este horário não está mais disponível. Escolha outro.";
      return;
    }
    const [created] = await tx
      .insert(appointments)
      .values({
        customerId: customer.id,
        providerId: provider.id,
        quoteId,
        quoteResponseId,
        serviceId: parsed.data.serviceId,
        scheduledAt,
        durationMinutes: slot.slotMinutes,
        addressText: parsed.data.addressText,
        status: "BOOKING_REQUESTED",
      })
      .returning({ id: appointments.id });
    appointmentId = created?.id;
  });

  if (slotError) return { error: slotError };
  if (!appointmentId) return { error: "Não foi possível agendar. Tente novamente." };

  await notify({
    userId: provider.userId,
    type: "BOOKING_REQUESTED",
    title: "Novo agendamento solicitado",
    body: `${formatDate(scheduledAt)} — aguarde sua confirmação`,
    link: "/prestador/agenda",
    referenceType: "APPOINTMENT",
    referenceId: appointmentId,
  });

  revalidatePath("/app/agendamentos");
  return {
    success: `Solicitação enviada para ${formatDate(scheduledAt)}! Você será notificado na confirmação.`,
    appointmentId,
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
  const role = session.role as "PROVIDER" | "CUSTOMER";

  let txError: string | null = null;
  let counterpartUserId: number | null = null;
  let notifyBody = "";
  let providerUserId: number | null = null;
  let providerIdRef: number | null = null;

  txError = await db
    .transaction(async (tx) => {
      const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
      if (!appointment) return "Agendamento não encontrado.";

      const [providerRow] = await tx
        .select({ id: providers.id, userId: providers.userId, status: providers.status })
        .from(providers)
        .where(eq(providers.id, appointment.providerId))
        .limit(1);
      const [customerRow] = await tx
        .select({ id: customers.id, userId: customers.userId })
        .from(customers)
        .where(eq(customers.id, appointment.customerId))
        .limit(1);

      // autorização: só as partes envolvidas
      if (role === "PROVIDER") {
        const [mine] = await tx
          .select({ id: providers.id })
          .from(providers)
          .where(eq(providers.userId, session.userId))
          .limit(1);
        if (!mine || mine.id !== appointment.providerId) return "Acesso negado.";
        if (providerRow?.status !== "APPROVED") {
          return "Sua conta não está autorizada a gerenciar agendamentos.";
        }
      } else {
        const [mine] = await tx
          .select({ id: customers.id })
          .from(customers)
          .where(eq(customers.userId, session.userId))
          .limit(1);
        if (!mine || mine.id !== appointment.customerId) return "Acesso negado.";
      }

      // máquina de estados + papel permitido
      if (!canTransition(appointment.status, newStatus)) {
        return `Transição inválida de ${appointment.status} para ${newStatus}.`;
      }
      const allowed = ROLE_ALLOWED[role][appointment.status] ?? [];
      if (!allowed.includes(newStatus)) {
        return role === "CUSTOMER"
          ? "Somente o profissional pode executar esta ação."
          : "Ação não permitida para este status.";
      }

      let newScheduledAt = appointment.scheduledAt;
      notifyBody = options?.reason ?? formatDate(appointment.scheduledAt);

      // cliente aceitando remarcação: a nova data proposta passa a valer
      if (appointment.status === "RESCHEDULE_PROPOSED" && newStatus === "BOOKING_CONFIRMED") {
        if (!appointment.proposedAt) return "Proposta de horário inválida.";
        if (appointment.proposedAt.getTime() <= Date.now()) {
          return "O horário proposto já passou. Peça uma nova remarcação.";
        }
        newScheduledAt = appointment.proposedAt;
        notifyBody = formatDate(appointment.proposedAt);
      }

      // prestador propondo remarcação: exige data futura
      if (newStatus === "RESCHEDULE_PROPOSED") {
        if (!options?.proposedAt || Number.isNaN(options.proposedAt.getTime())) {
          return "Informe a nova data.";
        }
        if (options.proposedAt.getTime() <= Date.now()) return "A nova data deve ser futura.";
        notifyBody = formatDate(options.proposedAt);
      }

      // confirmação: revalida o slot no momento da confirmação (excluindo o próprio)
      if (newStatus === "BOOKING_CONFIRMED") {
        const slot = await resolveSlot(tx, appointment.providerId, newScheduledAt, appointment.id);
        if (!slot.ok) {
          return slot.reason === "no_passado"
            ? "Esta data já passou."
            : "Este horário já foi ocupado ou saiu da sua agenda.";
        }
      }

      await tx
        .update(appointments)
        .set({
          status: newStatus as typeof appointments.$inferInsert.status,
          scheduledAt: newScheduledAt,
          proposedAt: newStatus === "RESCHEDULE_PROPOSED" ? (options?.proposedAt ?? null) : null,
          cancellationReason: newStatus === "CANCELLED" ? (options?.reason ?? "Sem justificativa") : null,
          cancelledBy: newStatus === "CANCELLED" ? role : null,
          updatedAt: new Date(),
        })
        .where(eq(appointments.id, appointmentId));

      counterpartUserId =
        role === "PROVIDER" ? (customerRow?.userId ?? null) : (providerRow?.userId ?? null);
      providerUserId = providerRow?.userId ?? null;
      providerIdRef = providerRow?.id ?? null;
      return null;
    })
    .catch((e) => (e instanceof Error ? e.message : "Erro inesperado"));

  if (txError) return { error: txError };

  if (counterpartUserId) {
    await notify({
      userId: counterpartUserId,
      type: `APPT_${newStatus}`,
      title: statusNotifyTitle(newStatus),
      body: notifyBody,
      link: role === "PROVIDER" ? "/app/agendamentos" : "/prestador/agenda",
      referenceType: "APPOINTMENT",
      referenceId: appointmentId,
    });
  }

  // incrementa contador de serviços concluídos (atômico)
  if (newStatus === "COMPLETED" && providerIdRef != null) {
    await db
      .update(providers)
      .set({ completedJobs: sql`${providers.completedJobs} + 1` })
      .where(eq(providers.id, providerIdRef));
    void providerUserId;
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
