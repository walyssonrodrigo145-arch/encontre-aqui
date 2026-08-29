import { NextRequest, NextResponse } from "next/server";
import { confirmPayment } from "@/server/services/payments";

/**
 * Webhook do gateway de pagamento (ex: Asaas).
 * Configure a URL no painel do gateway: {APP_URL}/api/webhooks/payments
 * Segurança: o header de token é obrigatório — configure PAYMENT_WEBHOOK_TOKEN em produção.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.PAYMENT_WEBHOOK_TOKEN;
    const provided = req.headers.get("asaas-access-token") ?? req.headers.get("x-webhook-token");
    if (!secret || provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    // Formato Asaas: { event: "PAYMENT_CONFIRMED", payment: { id: "..." } }
    const event = body.event ?? body.type;
    const paymentId = body.payment?.id ?? body.gatewayPaymentId ?? body.id;

    if (
      paymentId &&
      (event === "PAYMENT_CONFIRMED" ||
        event === "PAYMENT_RECEIVED" ||
        event === "payment.confirmed" ||
        event === "payment.succeeded")
    ) {
      await confirmPayment(String(paymentId));
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: true });
  }
}
