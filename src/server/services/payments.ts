import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments, subscriptions, boosts, providers } from "@/lib/schema";

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

/**
 * Adapter de gateway. Em produção, implemente AsaasGateway usando a API real:
 * POST /v3/payments (PIX/boleto/cartão) e /v3/subscriptions para recorrência.
 * O webhook correspondente deve chamar confirmPaymentAction abaixo.
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

  async createSubscription(input: { providerId: number; planId: number; amountCents: number; planName: string }): Promise<{ subscriptionId: number; payment: PaymentResult }> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const [subscription] = await db
      .insert(subscriptions)
      .values({
        providerId: input.providerId,
        planId: input.planId,
        status: "PENDING_PAYMENT",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      })
      .returning();

    const payment = await this.createPayment({
      providerId: input.providerId,
      subscriptionId: subscription!.id,
      amountCents: input.amountCents,
      description: `Assinatura ${input.planName} — mensal`,
      method: "PIX",
    });

    await db
      .update(subscriptions)
      .set({ gatewaySubscriptionId: `sub_${subscription!.id}` })
      .where(eq(subscriptions.id, subscription!.id));

    return { subscriptionId: subscription!.id, payment };
  },
};

/** Confirmar pagamento (chamado pelo webhook do gateway ou modo demo) */
export async function confirmPayment(gatewayPaymentId: string) {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.gatewayPaymentId, gatewayPaymentId))
    .limit(1);
  if (!payment || payment.status === "CONFIRMED") return;

  await db.update(payments).set({ status: "CONFIRMED", paidAt: new Date() }).where(eq(payments.id, payment.id));

  if (payment.subscriptionId) {
    // ativa a assinatura + atualiza plano do prestador
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, payment.subscriptionId)).limit(1);
    if (sub) {
      // cancela assinaturas anteriores
      await db
        .update(subscriptions)
        .set({ status: "CANCELED", canceledAt: new Date() })
        .where(eq(subscriptions.providerId, sub.providerId));
      await db.update(subscriptions).set({ status: "ACTIVE" }).where(eq(subscriptions.id, sub.id));
      await db.update(providers).set({ planId: sub.planId }).where(eq(providers.id, sub.providerId));
    }
  }

  if (payment.boostId) {
    await db.update(boosts).set({ status: "ACTIVE" }).where(eq(boosts.id, payment.boostId));
  }
}

/** Expiração de assinaturas e impulsões (chamar por cron /api/cron) */
export async function expireOverdue() {
  const now = new Date();

  const activeSubs = await db.select().from(subscriptions).where(eq(subscriptions.status, "ACTIVE"));
  for (const sub of activeSubs) {
    if (sub.currentPeriodEnd < now) {
      await db.update(subscriptions).set({ status: "PAST_DUE" }).where(eq(subscriptions.id, sub.id));
    }
  }

  const activeBoosts = await db.select().from(boosts).where(eq(boosts.status, "ACTIVE"));
  for (const b of activeBoosts) {
    if (b.endsAt < now) {
      await db.update(boosts).set({ status: "EXPIRED" }).where(eq(boosts.id, b.id));
    }
  }
}
