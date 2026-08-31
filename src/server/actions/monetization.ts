"use server";

import { friendlyError } from "@/server/errors";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { boosts, notifications, providers, subscriptionPlans, subscriptions } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { PaymentGateway, createSubscriptionWithPayment, confirmPayment } from "@/server/services/payments";
import { BOOST_CONFIG, boostPriceCents } from "@/lib/boost";

/**
 * Modo de pagamento: "demo" confirma na hora (desenvolvimento/staging).
 * Em produção configure PAYMENTS_MODE=live — a confirmação passa a ocorrer
 * EXCLUSIVAMENTE pelo webhook autenticado (/api/webhooks/payments).
 */
function isDemoPayments(): boolean {
  return (process.env.PAYMENTS_MODE ?? "demo") !== "live";
}

export interface MonetizationState {
  error?: string;
  success?: string;
  pixQrCode?: string;
}

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
    if (provider.status !== "APPROVED") {
      return { error: "Seu cadastro precisa estar aprovado para assinar um plano." };
    }

    // transação: checagem de assinatura ativa + criação são atômicas (evita cobrança dupla)
    let gatewayPaymentId: string | undefined;
    let duplicateError: string | undefined;
    await db.transaction(async (tx) => {
      const [activeSub] = await tx
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(and(eq(subscriptions.providerId, provider.id), eq(subscriptions.status, "ACTIVE")))
        .limit(1);
      if (activeSub) {
        duplicateError = "Você já possui uma assinatura ativa. Cancele-a antes de trocar de plano.";
        return;
      }
      const res = await createSubscriptionWithPayment(tx, {
        providerId: provider.id,
        planId: plan.id,
        amountCents: plan.priceCents,
        planName: plan.name,
      });
      gatewayPaymentId = res.gatewayPaymentId;
    });

    if (duplicateError) return { error: duplicateError };
    if (!gatewayPaymentId) return { error: "Não foi possível criar a assinatura. Tente novamente." };

    // modo demo: confirma na hora para o fluxo funcionar end-to-end
    if (isDemoPayments()) await confirmPayment(gatewayPaymentId);

    await db.insert(notifications).values({
      userId: session.userId,
      type: "SUBSCRIPTION_ACTIVE",
      title: `Assinatura ${plan.name} ativada! 🎉`,
      body: `Plano ativo por 30 dias (${(plan.priceCents / 100).toFixed(2).replace(".", ",")}). Você será avisado na renovação.`,
      link: "/prestador/assinatura",
    });

    revalidatePath("/prestador/assinatura");
    revalidatePath("/prestador/painel");
    return {
      success: isDemoPayments()
        ? `Plano ${plan.name} ativado com sucesso!`
        : `Assinatura criada! Conclua o pagamento para ativar o plano ${plan.name}.`,
    };
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
      .limit(1);
    if (!sub) return { error: "Nenhuma assinatura ativa." };
    if (sub.cancelAtPeriodEnd) return { error: "O cancelamento já está agendado para o fim do período." };

    // cancela no FIM do período já pago — benefícios continuam até lá
    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: true })
      .where(eq(subscriptions.id, sub.id));

    await db.insert(notifications).values({
      userId: session.userId,
      type: "SUBSCRIPTION_CANCEL_SCHEDULED",
      title: "Cancelamento agendado",
      body: "Seu plano segue ativo até o fim do período já pago. Depois disso não será renovado.",
      link: "/prestador/assinatura",
    });

    revalidatePath("/prestador/assinatura");
    return {
      success: `Cancelamento agendado. Seu plano segue ativo até ${sub.currentPeriodEnd.toLocaleDateString("pt-BR")}.`,
    };
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

    const priceCents = boostPriceCents(type, days);

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + days);

    // transação: no máximo 1 impulsionamento ativo por prestador
    let boostId: number | undefined;
    let boostError: string | undefined;
    await db.transaction(async (tx) => {
      const [active] = await tx
        .select({ id: boosts.id })
        .from(boosts)
        .where(and(eq(boosts.providerId, provider.id), eq(boosts.status, "ACTIVE")))
        .limit(1);
      if (active) {
        boostError = "Você já tem um impulsionamento ativo. Aguarde ele terminar.";
        return;
      }
      const [boost] = await tx
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
        .returning({ id: boosts.id });
      boostId = boost?.id;
    });

    if (boostError) return { error: boostError };
    if (!boostId) return { error: "Não foi possível criar o impulsionamento. Tente novamente." };

    const payment = await PaymentGateway.createPayment({
      providerId: provider.id,
      boostId,
      amountCents: priceCents,
      description: `Impulsionamento ${BOOST_CONFIG[type]!.label} — ${days} dia(s)`,
      method: "PIX",
    });

    // modo demo: confirma na hora
    if (isDemoPayments() && payment.gatewayPaymentId) await confirmPayment(payment.gatewayPaymentId);

    await db.insert(notifications).values({
      userId: session.userId,
      type: "BOOST_ACTIVE",
      title: "🚀 Impulsionamento ativo!",
      body: `Seu perfil está com mais exposição por ${days} dia(s).`,
      link: "/prestador/impulsionar",
    });

    revalidatePath("/prestador/impulsionar");
    return {
      success: isDemoPayments()
        ? `Impulsionamento ${BOOST_CONFIG[type]!.label} ativo por ${days} dia(s)!`
        : `Impulsionamento criado! Conclua o pagamento para ativá-lo.`,
      pixQrCode: payment.pixQrCode,
    };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}
