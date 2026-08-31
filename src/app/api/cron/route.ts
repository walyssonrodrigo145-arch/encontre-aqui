import { NextRequest, NextResponse } from "next/server";
import { expireOverdue } from "@/server/services/payments";
import { expireStaleBookingRequests } from "@/server/services/maintenance";

/**
 * Cron de manutenção: expira assinaturas vencidas (removendo benefícios),
 * impulsões e solicitações de agendamento esquecidas.
 * Chame periodicamente (ex: a cada hora) com: GET {APP_URL}/api/cron?token=CRON_SECRET
 * O token é obrigatório — sem CRON_SECRET configurado o endpoint fica desativado.
 */
export async function GET(req: NextRequest) {
  // aceita token via query (?token=) ou via header Authorization: Bearer (não vira log de URL)
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const token = bearer ?? req.nextUrl.searchParams.get("token");
  const expected = process.env.CRON_SECRET;

  if (!expected || !token || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const paymentsResult = await expireOverdue();
    const bookingsExpired = await expireStaleBookingRequests();
    return NextResponse.json({
      ok: true,
      ranAt: new Date().toISOString(),
      subscriptionsExpired: paymentsResult.subs,
      boostsExpired: paymentsResult.boosts,
      bookingsExpired,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
