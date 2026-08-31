import { and, eq, lt, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, payments, subscriptions, boosts, providers } from "@/lib/schema";

export interface CreatePaymentInput {
  providerId: number;
  amountCents: number;
  description: string;
  subscriptionId?: number;
  boostId?: number;
  method?: "PIX" | "CARD" | "MANUAL";
}

export interface PaymentResult {
  paymentId: number;
  status: "PENDING" | "CONFIRMED";
  gatewayPaymentId: string | null;
  pixQrCode?: string;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Adapter de gateway (modo demo). Em produção, implemente AsaasGateway usando a
 * API real: POST /v3/payments (PIX/boleto/cartão) e /v3/subscriptions.
 * O webhook correspondente deve chamar confirmPayment abaixo.
 */
export const PaymentGateway = {
  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const [payment] = await db
      .insert(payments)
      .values({
        providerId: input.providerId,
        subscriptionId: input.subscriptionId,
        boostId: input.boostId,
        amountCents: input.amountCents,
        description: input.description,
        method: input.method ?? "PIX",
        status: "PENDING",
        gatewayPaymentId: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      })
      .returning();

    return {
      paymentId: payment!.id,
      status: "PENDING",
      gatewayPaymentId: payment!.gatewayPaymentId,
      pixQrCode: `00020126BR.GOV.BCB.PIX01DEMO${payment!.id}5204000053039865802BR6009SAO PAULO62070503***6304DEMO`,
    };
  },
};

/** Cria assinatura PENDING_PAYMENT + pagamento, dentro de uma transação. */
export async function createSubscriptionWithPayment(
  tx: Tx,
  input: { providerId: number; planId: number; amountCents: number; planName: string },
): Promise<{ subscriptionId: number; gatewayPaymentId: string }> {
  const [subscription] = await tx
    .insert(subscriptions)
    .values({
      providerId: input.providerId,
      planId: input.planId,
      status: "PENDING_PAYMENT",
      // provisório — os períodos reais são gravados na confirmação do pagamento
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .returning({ id: subscriptions.id });
  const subscriptionId = subscription!.id;

  const [payment] = await tx
    .insert(payments)
    .values({
      providerId: input.providerId,
      subscriptionId,
      amountCents: input.amountCents,
      description: `Assinatura ${input.planName} — mensal`,
      method: "PIX",
      status: "PENDING",
      gatewayPaymentId: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    })
    .returning({ gatewayPaymentId: payments.gatewayPaymentId });

  await tx
    .update(subscriptions)
    .set({ gatewaySubscriptionId: `sub_${subscriptionId}` })
    .where(eq(subscriptions.id, subscriptionId));

  return { subscriptionId, gatewayPaymentId: payment!.gatewayPaymentId! };
}

export interface ConfirmResult {
  ok: boolean;
  alreadyConfirmed?: boolean;
  reason?: "not_found" | "amount_mismatch";
}

/**
 * Confirmar pagamento (webhook do gateway ou modo demo).
 * Idempotente: dentro de transação, revalida o status antes de aplicar efeitos.
 */
export async function confirmPayment(
  gatewayPaymentId: string,
  expectedAmountCents?: number,
): Promise<ConfirmResult> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.gatewayPaymentId, gatewayPaymentId))
      .limit(1);
    if (!payment) return { ok: false, reason: "not_found" as const };
    if (payment.status === "CONFIRMED") return { ok: true, alreadyConfirmed: true };

    // proteção contra pagamento de valor divergente (gateway real)
    if (
      expectedAmountCents != null &&
      Math.abs(expectedAmountCents - payment.amountCents) > 1 // tolerância de 1 centavo
    ) {
      return { ok: false, reason: "amount_mismatch" as const };
    }

    await tx.update(payments).set({ status: "CONFIRMED", paidAt: new Date() }).where(eq(payments.id, payment.id));

    if (payment.subscriptionId) {
      // ativa a assinatura + atualiza plano do prestador; cancela as OUTRAS assinaturas
      const [sub] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, payment.subscriptionId))
        .limit(1);
      if (sub && sub.status !== "ACTIVE") {
        await tx
          .update(subscriptions)
          .set({ status: "CANCELED", canceledAt: new Date() })
          .where(and(eq(subscriptions.providerId, sub.providerId), ne(subscriptions.id, sub.id)));
        await tx
          .update(subscriptions)
          .set({ status: "ACTIVE", cancelAtPeriodEnd: false })
          .where(eq(subscriptions.id, sub.id));
        // período começa na confirmação (não na criação)
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        await tx
          .update(subscriptions)
          .set({ currentPeriodStart: now, currentPeriodEnd: periodEnd })
          .where(eq(subscriptions.id, sub.id));
        await tx.update(providers).set({ planId: sub.planId }).where(eq(providers.id, sub.providerId));
      }
    }

    if (payment.boostId) {
      await tx
        .update(boosts)
        .set({ status: "ACTIVE" })
        .where(and(eq(boosts.id, payment.boostId), eq(boosts.status, "PENDING_PAYMENT")));
    }

    return { ok: true };
  });
}

/**
 * Manutenção periódica (chamar por /api/cron):
 * - assinaturas vencidas → CANCELED (canceladas) ou PAST_DUE, sempre removendo o plano do prestador
 * - impulsões vencidas → EXPIRED
 * - notifica o prestador em cada caso
 */
export async function expireOverdue(): Promise<{ subs: number; boosts: number }> {
  const now = new Date();
  let subsExpired = 0;
  let boostsExpired = 0;

  const overdueSubs = await db
    .select({ sub: subscriptions, providerUserId: providers.userId })
    .from(subscriptions)
    .innerJoin(providers, eq(subscriptions.providerId, providers.id))
    .where(and(eq(subscriptions.status, "ACTIVE"), lt(subscriptions.currentPeriodEnd, now)));

  for (const { sub, providerUserId } of overdueSubs) {
    const canceled = sub.cancelAtPeriodEnd === true;
    await db
      .update(subscriptions)
      .set({
        status: canceled ? "CANCELED" : "PAST_DUE",
        canceledAt: canceled ? now : null,
      })
      .where(and(eq(subscriptions.id, sub.id), eq(subscriptions.status, "ACTIVE")));
    // benefícios do plano nunca sobrevivem à expiração
    if (sub.planId != null) {
      await db
        .update(providers)
        .set({ planId: null })
        .where(and(eq(providers.id, sub.providerId), eq(providers.planId, sub.planId)));
    }
    await db.insert(notifications).values({
      userId: providerUserId,
      type: "SUBSCRIPTION_EXPIRED",
      title: canceled ? "Assinatura cancelada" : "Assinatura vencida ⚠️",
      body: canceled
        ? "Seu plano foi encerrado conforme solicitado. Reative quando quiser."
        : "Seu plano venceu e o destaque nas buscas foi removido. Reative para continuar em destaque.",
      link: "/prestador/assinatura",
    });
    subsExpired++;
  }

  const overdueBoosts = await db
    .select({ boost: boosts, providerUserId: providers.userId })
    .from(boosts)
    .innerJoin(providers, eq(boosts.providerId, providers.id))
    .where(and(eq(boosts.status, "ACTIVE"), lt(boosts.endsAt, now)));

  for (const { boost, providerUserId } of overdueBoosts) {
    await db
      .update(boosts)
      .set({ status: "EXPIRED" })
      .where(and(eq(boosts.id, boost.id), eq(boosts.status, "ACTIVE")));
    await db.insert(notifications).values({
      userId: providerUserId,
      type: "BOOST_EXPIRED",
      title: "Impulsionamento encerrado",
      body: "Seu impulsionamento chegou ao fim. Crie outro para manter o destaque nas buscas.",
      link: "/prestador/impulsionar",
    });
    boostsExpired++;
  }

  return { subs: subsExpired, boosts: boostsExpired };
}
