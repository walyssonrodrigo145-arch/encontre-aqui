"use server";

import { friendlyError } from "@/server/errors";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { boosts, notifications, providers, subscriptionPlans, subscriptions } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { PaymentGateway, createSubscriptionWithPayment, confirmPayment } from "@/server/services/payments";
import { BOOST_CONFIG, boostPriceCents } from "@/lib/boost";
import { upsertCustomer, createPixCharge, createSubscription } from "@/server/services/asaas";
import { decryptDocument } from "@/lib/crypto";
import { brtDateString } from "@/lib/tz";

/**
 * Modo de pagamento: "demo" confirma na hora (desenvolvimento/staging).
 * Em produção configure PAYMENTS_MODE=live — a confirmação passa a ocorrer
 * EXCLUSIVAMENTE pelo webhook autenticado (/api/webhooks/payments).
 */
function isDemoPayments(): boolean {
  return (process.env.PAYMENTS_MODE ?? "demo") !== "live";
}

/** Trial: 30 dias de acesso + 3 dias de prazo = primeira cobrança no dia 33. */
const TRIAL_DAYS = 30;
const PAYMENT_DEADLINE_DAYS = 3;

/** Cria (ou recupera) o customer do prestador no Asaas usando o documento criptografado. */
async function ensureAsaasCustomer(provider: {
  id: number;
  displayName: string;
  cpfCnpjEncrypted: string | null;
  asaasCustomerId: string | null;
}): Promise<{ ok: true; customerId: string } | { ok: false; error: string }> {
  if (provider.asaasCustomerId) return { ok: true, customerId: provider.asaasCustomerId };

  const doc = decryptDocument(provider.cpfCnpjEncrypted);
  if (!doc) {
    return {
      ok: false,
      error: "Documento do prestador não disponível para cobrança. Entre em contato com o suporte.",
    };
  }

  const result = await upsertCustomer({ name: provider.displayName, cpfCnpj: doc, email: "" });
  if (!result.ok || !result.data) return { ok: false, error: result.error ?? "Erro no gateway de pagamento." };

  await db.update(providers).set({ asaasCustomerId: result.data.customerId }).where(eq(providers.id, provider.id));
  return { ok: true, customerId: result.data.customerId };
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
    let liveTrialActivated = false;
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

      if (!isDemoPayments()) {
        // ── MODO LIVE (Asaas real) ──
        const customer = await ensureAsaasCustomer(provider);
        if (!customer.ok) {
          duplicateError = customer.error;
          return;
        }

        // trial: 30 dias de acesso grátis + 3 dias de prazo (primeira cobrança no dia 33)
        const useTrial = !provider.trialUsed;
        const now = new Date();
        const windowDays = useTrial ? TRIAL_DAYS + PAYMENT_DEADLINE_DAYS : PAYMENT_DEADLINE_DAYS;
        const periodEnd = new Date(now.getTime() + windowDays * 24 * 3600_000);
        const nextDueDate = brtDateString(new Date(now.getTime() + windowDays * 24 * 3600_000));

        const [sub] = await tx
          .insert(subscriptions)
          .values({
            providerId: provider.id,
            planId: plan.id,
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          })
          .returning({ id: subscriptions.id });
        const subscriptionId = sub!.id;

        if (useTrial) {
          await tx.update(providers).set({ trialUsed: true }).where(eq(providers.id, provider.id));
        }

        const asaas = await createSubscription({
          customerId: customer.customerId,
          valueCents: plan.priceCents,
          description: `Assinatura ${plan.name} — mensal`,
          nextDueDate,
          externalReference: `sub_${subscriptionId}`,
        });
        if (!asaas.ok || !asaas.data) {
          throw new Error(asaas.error ?? "Erro no gateway de pagamento.");
        }
        await tx
          .update(subscriptions)
          .set({ gatewaySubscriptionId: asaas.data.subscriptionId })
          .where(eq(subscriptions.id, subscriptionId));

        liveTrialActivated = useTrial;
        return; // live: pagamento confirmado apenas via webhook
      }

      // ── MODO DEMO ──
      const res = await createSubscriptionWithPayment(tx, {
        providerId: provider.id,
        planId: plan.id,
        amountCents: plan.priceCents,
        planName: plan.name,
      });
      gatewayPaymentId = res.gatewayPaymentId;
    });

    if (duplicateError) return { error: duplicateError };

    if (isDemoPayments()) {
      if (!gatewayPaymentId) return { error: "Não foi possível criar a assinatura. Tente novamente." };
      await confirmPayment(gatewayPaymentId);

      await db.insert(notifications).values({
        userId: session.userId,
        type: "SUBSCRIPTION_ACTIVE",
        title: `Assinatura ${plan.name} ativada! 🎉`,
        body: `Plano ativo por 30 dias (${(plan.priceCents / 100).toFixed(2).replace(".", ",")}). Você será avisado na renovação.`,
        link: "/prestador/assinatura",
      });

      revalidatePath("/prestador/assinatura");
      revalidatePath("/prestador/painel");
      return { success: `Plano ${plan.name} ativado com sucesso!` };
    }

    // ── LIVE: sub ativa (trial) ou aguardando PIX — confirmação vem pelo webhook ──
    await db.insert(notifications).values({
      userId: session.userId,
      type: "SUBSCRIPTION_ACTIVE",
      title: `Assinatura ${plan.name} registrada!`,
      body: liveTrialActivated
        ? `Trial de ${TRIAL_DAYS} dias ativado! Primeira cobrança só depois do trial.`
        : "Aguardando pagamento PIX. O acesso é liberado na confirmação.",
      link: "/prestador/assinatura",
    });

    revalidatePath("/prestador/assinatura");
    revalidatePath("/prestador/painel");
    return {
      success: liveTrialActivated
        ? `Trial de ${TRIAL_DAYS} dias do plano ${plan.name} ativado!`
        : "Assinatura criada! Pague o PIX para ativar.",
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

    let pixQr = "";
    if (isDemoPayments()) {
      // ── DEMO: pagamento local fake confirmado na hora ──
      const payment = await PaymentGateway.createPayment({
        providerId: provider.id,
        boostId: boostId!,
        amountCents: priceCents,
        description: `Impulsionamento ${BOOST_CONFIG[type]!.label} — ${days} dia(s)`,
        method: "PIX",
      });
      if (payment.gatewayPaymentId) await confirmPayment(payment.gatewayPaymentId);
      pixQr = payment.pixQrCode ?? "";
    } else {
      // ── LIVE: PIX real no Asaas com vencimento em 3 dias ──
      const customer = await ensureAsaasCustomer(provider);
      if (!customer.ok) return { error: customer.error };

      const charge = await createPixCharge({
        customerId: customer.customerId,
        valueCents: priceCents,
        description: `Impulsionamento ${BOOST_CONFIG[type]!.label} — ${days} dia(s)`,
        externalReference: `boost_${boostId}`,
      });
      if (!charge.ok || !charge.data) return { error: charge.error ?? "Erro ao gerar o PIX." };
      pixQr = charge.data.qrCode;
    }

    await db.insert(notifications).values({
      userId: session.userId,
      type: "BOOST_ACTIVE",
      title: isDemoPayments() ? "🚀 Impulsionamento ativo!" : "🚀 PIX gerado!",
      body: isDemoPayments()
        ? `Seu perfil está com mais exposição por ${days} dia(s).`
        : `Pague o PIX em até 3 dias para ativar ${days} dia(s) de destaque.`,
      link: "/prestador/impulsionar",
    });

    revalidatePath("/prestador/impulsionar");
    return {
      success: isDemoPayments()
        ? `Impulsionamento ${BOOST_CONFIG[type]!.label} ativo por ${days} dia(s)!`
        : "PIX gerado! Pague em até 3 dias para ativar o impulsionamento.",
      pixQrCode: pixQr,
    };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}
