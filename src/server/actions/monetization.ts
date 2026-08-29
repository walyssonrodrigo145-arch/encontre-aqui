"use server";

import { friendlyError } from "@/server/errors";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { boosts, notifications, providers, subscriptionPlans, subscriptions } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { PaymentGateway } from "@/server/services/payments";

export interface MonetizationState {
  error?: string;
  success?: string;
  pixQrCode?: string;
}

const BOOST_CONFIG: Record<string, { multiplier: number; label: string }> = {
  BASIC: { multiplier: 0.1, label: "Básico" },
  REGIONAL: { multiplier: 0.2, label: "Regional" },
  FEATURED: { multiplier: 0.3, label: "Destaque" },
};

export async function subscribeAction(
  _prev: MonetizationState | undefined,
  formData: FormData,
): Promise<MonetizationState> {
  try {
    const session = await requireRole("PROVIDER");
    const planId = Number(formData.get("planId"));
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
    if (!plan || !plan.isActive) return { error: "Plano indisponível." };

    const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
    if (!provider) return { error: "Perfil não encontrado." };

    // evita assinaturas duplicadas enquanto já existe uma ativa
    const [activeSub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(eq(subscriptions.providerId, provider.id), eq(subscriptions.status, "ACTIVE")))
      .limit(1);
    if (activeSub) {
      return { error: "Você já possui uma assinatura ativa. Cancele-a antes de trocar de plano." };
    }

    const { payment } = await PaymentGateway.createSubscription({
      providerId: provider.id,
      planId: plan.id,
      amountCents: plan.priceCents,
      planName: plan.name,
    });

    // modo demo: confirma na hora para o fluxo funcionar end-to-end
    const { confirmPayment } = await import("@/server/services/payments");
    if (payment.gatewayPaymentId) await confirmPayment(payment.gatewayPaymentId);

    await db.insert(notifications).values({
      userId: session.userId,
      type: "SUBSCRIPTION_ACTIVE",
      title: `Assinatura ${plan.name} ativada! 🎉`,
      body: `Renovação automática mensal de R$ ${(plan.priceCents / 100).toFixed(2).replace(".", ",")}.`,
      link: "/prestador/assinatura",
    });

    revalidatePath("/prestador/assinatura");
    revalidatePath("/prestador/painel");
    return { success: `Plano ${plan.name} ativado com sucesso!` };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function cancelSubscriptionAction(): Promise<MonetizationState> {
  try {
    const session = await requireRole("PROVIDER");
    const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
    if (!provider) return { error: "Perfil não encontrado." };

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.providerId, provider.id), eq(subscriptions.status, "ACTIVE")))
      .orderBy(desc(subscriptions.id))
      .limit(1);
    if (!sub) return { error: "Nenhuma assinatura ativa." };

    await db.update(subscriptions).set({ status: "CANCELED", canceledAt: new Date() }).where(eq(subscriptions.id, sub.id));
    await db.update(providers).set({ planId: null }).where(eq(providers.id, provider.id));

    revalidatePath("/prestador/assinatura");
    return { success: "Assinatura cancelada. Você pode reativar quando quiser." };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function createBoostAction(
  _prev: MonetizationState | undefined,
  formData: FormData,
): Promise<MonetizationState> {
  try {
    const session = await requireRole("PROVIDER");
    const type = String(formData.get("type") ?? "BASIC") as "BASIC" | "REGIONAL" | "FEATURED";
    const days = Number(formData.get("days") ?? 7);

    if (!BOOST_CONFIG[type]) return { error: "Tipo de impulsionamento inválido." };
    if (![1, 3, 7, 15, 30].includes(days)) return { error: "Duração inválida." };

    const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
    if (!provider) return { error: "Perfil não encontrado." };
    if (provider.status !== "APPROVED") return { error: "Seu perfil precisa estar aprovado para impulsionar." };

    // tabela de preços por dia (configurável pelo admin no futuro)
    const basePerDay: Record<number, number> = { 1: 990, 3: 2490, 7: 4990, 15: 8990, 30: 14900 };
    const typeFactor = type === "BASIC" ? 1 : type === "REGIONAL" ? 1.8 : 2.5;
    const priceCents = Math.round((basePerDay[days] ?? 4990) * typeFactor);

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + days);

    const [boost] = await db
      .insert(boosts)
      .values({
        providerId: provider.id,
        type,
        multiplier: BOOST_CONFIG[type]!.multiplier,
        priceCents,
        startsAt,
        endsAt,
        status: "PENDING_PAYMENT",
      })
      .returning();

    const payment = await PaymentGateway.createPayment({
      providerId: provider.id,
      boostId: boost!.id,
      amountCents: priceCents,
      description: `Impulsionamento ${BOOST_CONFIG[type]!.label} — ${days} dia(s)`,
      method: "PIX",
    });

    // modo demo: confirma na hora
    const { confirmPayment } = await import("@/server/services/payments");
    if (payment.gatewayPaymentId) await confirmPayment(payment.gatewayPaymentId);

    await db.insert(notifications).values({
      userId: session.userId,
      type: "BOOST_ACTIVE",
      title: "🚀 Impulsionamento ativo!",
      body: `Seu perfil está com mais exposição por ${days} dia(s).`,
      link: "/prestador/impulsionar",
    });

    revalidatePath("/prestador/impulsionar");
    return { success: `Impulsionamento ${BOOST_CONFIG[type]!.label} ativo por ${days} dia(s)!`, pixQrCode: payment.pixQrCode };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}
