import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { confirmPayment, handleAsaasPaymentCreated, markAsaasPaymentState } from "@/server/services/payments";

/** Comparação de token em tempo constante. */
function tokenMatches(provided: string, secret: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(secret).digest();
  return a.equals(b);
}

/**
 * Webhook do gateway de pagamento (ex: Asaas).
 * Configure a URL no painel do gateway: {APP_URL}/api/webhooks/payments
 * Segurança: o header de token é obrigatório — configure PAYMENT_WEBHOOK_TOKEN em produção.
 * O valor do pagamento é validado contra o valor esperado antes de confirmar.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PAYMENT_WEBHOOK_TOKEN;
  const provided = req.headers.get("asaas-access-token") ?? req.headers.get("x-webhook-token");
  if (!secret || !provided || !tokenMatches(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  // Formato Asaas: { event: "PAYMENT_CONFIRMED", payment: { id: "..." } }
  const event = body.event ?? body.type;
  const paymentId = body.payment?.id ?? body.gatewayPaymentId ?? body.id;

  // valor informado pelo gateway (em reais no Asaas) → centavos
  let expectedCents: number | undefined;
  const rawValue = body.payment?.value ?? body.value;
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    expectedCents = Math.round(rawValue * 100);
  }

  const asaasSubscriptionId = body.payment?.subscription ?? null;

  try {
    // renovação: cobrança do ciclo seguinte criada pelo Asaas
    if (paymentId && event === "PAYMENT_CREATED") {
      await handleAsaasPaymentCreated(String(paymentId), asaasSubscriptionId, expectedCents);
      return NextResponse.json({ received: true });
    }

    if (!paymentId) return NextResponse.json({ received: true, ignored: true });

    if (
      event === "PAYMENT_CONFIRMED" ||
      event === "PAYMENT_RECEIVED" ||
      event === "payment.confirmed" ||
      event === "payment.succeeded"
    ) {
      const result = await confirmPayment(String(paymentId), expectedCents);
      if (!result.ok) {
        if (result.reason === "amount_mismatch") {
          return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
        }
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }
      return NextResponse.json({ received: true });
    }

    if (event === "PAYMENT_OVERDUE" || event === "payment.overdue") {
      await markAsaasPaymentState(String(paymentId), "FAILED");
      return NextResponse.json({ received: true });
    }

    if (event === "PAYMENT_DELETED" || event === "payment.deleted") {
      await markAsaasPaymentState(String(paymentId), "FAILED");
      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true, ignored: true });
  } catch {
    // 500 força o gateway a reenviar o webhook (retry)
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
