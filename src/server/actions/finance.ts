"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { appointments, customers, providerFinances, providers, services, users } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/server/errors";
import { brtDateString } from "@/lib/tz";

export interface FinanceState {
  error?: string;
  success?: string;
}

const FINANCE_CATEGORIES: Record<string, string[]> = {
  INCOME: ["servico", "assessoria", "outro"],
  EXPENSE: ["materiais", "transporte", "combustivel", "ferramentas", "marketing", "impostos", "outro"],
};

async function getMyProvider() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) throw new Error("FORBIDDEN");
  return provider;
}

function validateEntry(input: {
  kind: string;
  title: string;
  amountCents: number | null;
  occurredAt: string;
  category: string;
}): string | null {
  if (input.kind !== "INCOME" && input.kind !== "EXPENSE") return "Tipo de lançamento inválido.";
  const title = input.title.trim();
  if (title.length < 2 || title.length > 120) return "Informe uma descrição (2 a 120 caracteres).";
  if (!Number.isInteger(input.amountCents) || input.amountCents! < 100 || input.amountCents! > 50_000_000) {
    return "Informe um valor entre R$ 1,00 e R$ 500.000,00.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredAt)) return "Data inválida.";
  const categories = Object.keys(FINANCE_CATEGORIES[input.kind]);
  if (!categories.includes(input.category)) return "Categoria inválida.";
  return null;
}

export async function createFinanceEntryAction(
  _prev: FinanceState | undefined,
  formData: FormData,
): Promise<FinanceState> {
  try {
    const provider = await getMyProvider();
    if (provider.status !== "APPROVED") return { error: "Sua conta precisa estar aprovada." };

    const kind = String(formData.get("kind") ?? "");
    const title = String(formData.get("title") ?? "");
    const amountRaw = String(formData.get("amount") ?? "").replace(/\./g, "").replace(",", ".").trim();
    const amountNumber = Number(amountRaw);
    const amountCents = Number.isFinite(amountNumber) ? Math.round(amountNumber * 100) : null;
    const occurredAt = String(formData.get("occurredAt") ?? "");
    const category = String(formData.get("category") ?? "outro");
    const notes = String(formData.get("notes") ?? "").trim() || null;

    const error = validateEntry({ kind, title, amountCents, occurredAt, category });
    if (error) return { error };

    const today = brtDateString(new Date());
    if (occurredAt > today) return { error: "A data não pode ser no futuro." };

    await db.insert(providerFinances).values({
      providerId: provider.id,
      kind: kind as "INCOME" | "EXPENSE",
      title: title.slice(0, 120),
      amountCents: amountCents!,
      occurredAt,
      category,
      notes: notes?.slice(0, 300) ?? null,
      source: "MANUAL",
    });

    revalidatePath("/prestador/financeiro");
    return { success: kind === "INCOME" ? "Receita registrada!" : "Despesa registrada!" };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function deleteFinanceEntryAction(id: number): Promise<FinanceState> {
  try {
    const provider = await getMyProvider();
    const res = await db
      .delete(providerFinances)
      .where(and(eq(providerFinances.id, id), eq(providerFinances.providerId, provider.id), eq(providerFinances.source, "MANUAL")));
    const changed = (res as unknown as { rowsAffected?: number }).rowsAffected ?? 0;
    if (changed === 0) return { error: "Lançamento não encontrado (lançamentos da plataforma não podem ser removidos)." };
    revalidatePath("/prestador/financeiro");
    return { success: "Lançamento removido." };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

/** Registra a receita de um serviço concluído (1 clique, pré-preenchido). */
export async function registerAppointmentIncomeAction(
  _prev: FinanceState | undefined,
  formData: FormData,
): Promise<FinanceState> {
  try {
    const provider = await getMyProvider();
    if (provider.status !== "APPROVED") return { error: "Sua conta precisa estar aprovada." };

    const appointmentId = Number(formData.get("appointmentId"));
    if (!Number.isInteger(appointmentId)) return { error: "Agendamento inválido." };

    const amountRaw = String(formData.get("amount") ?? "").replace(/\./g, "").replace(",", ".").trim();
    const amountNumber = Number(amountRaw);
    const amountCents = Number.isFinite(amountNumber) ? Math.round(amountNumber * 100) : null;
    if (!amountCents || amountCents < 100) return { error: "Informe o valor recebido (mínimo R$ 1,00)." };

    const occurredAt = String(formData.get("occurredAt") ?? "") || brtDateString(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) return { error: "Data inválida." };
    if (occurredAt > brtDateString(new Date())) return { error: "A data não pode ser no futuro." };

    // agendamento deve ser do prestador, concluído e ainda sem lançamento
    const [appt] = await db
      .select({ id: appointments.id, serviceName: services.name, customerName: users.name })
      .from(appointments)
      .innerJoin(customers, eq(appointments.customerId, customers.id))
      .innerJoin(users, eq(customers.userId, users.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(and(eq(appointments.id, appointmentId), eq(appointments.providerId, provider.id), eq(appointments.status, "COMPLETED")))
      .limit(1);
    if (!appt) return { error: "Agendamento não encontrado ou não concluído." };

    const [already] = await db
      .select({ id: providerFinances.id })
      .from(providerFinances)
      .where(eq(providerFinances.appointmentId, appointmentId))
      .limit(1);
    if (already) return { error: "Este serviço já tem receita registrada." };

    await db.insert(providerFinances).values({
      providerId: provider.id,
      kind: "INCOME",
      title: `Serviço — ${appt.customerName}${appt.serviceName ? ` (${appt.serviceName})` : ""}`.slice(0, 120),
      amountCents,
      occurredAt,
      category: "servico",
      source: "MANUAL",
      appointmentId,
    });

    revalidatePath("/prestador/financeiro");
    return { success: "Receita registrada!" };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

