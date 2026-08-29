import { NextRequest, NextResponse } from "next/server";
import { expireOverdue } from "@/server/services/payments";

/**
 * Cron de manutenção: expira assinaturas vencidas e impulsões.
 * Chame periodicamente (ex: a cada hora) com: GET {APP_URL}/api/cron?token=CRON_SECRET
 * O token é obrigatório — sem CRON_SECRET configurado o endpoint fica desativado.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.CRON_SECRET;

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await expireOverdue();
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString() });
}
