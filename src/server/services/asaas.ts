/**
 * Cliente da API Asaas (v3) — server-side ONLY.
 *
 * Sandbox:  https://api-sandbox.asaas.com/v3
 * Produção: https://api.asaas.com/v3
 * Auth:     header `access_token: $ASAAS_API_KEY`
 *
 * - Timeout de 15s por chamada
 * - Retry com backoff em 429 (rate limit) e 5xx (até 3 tentativas)
 * - Erros retornam objeto { ok: false, error, status } — nunca lançam dados sensíveis
 */
import { brtDateString } from "@/lib/tz";

const BASE_URL =
  process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

export function isAsaasConfigured(): boolean {
  return !!process.env.ASAAS_API_KEY;
}

function apiKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada. Configure no .env para usar o modo live.");
  return key;
}

interface AsaasResult<T> {
  ok: boolean;
  status?: number;
  data?: T;
  error?: string;
}

async function asaasFetch<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
): Promise<AsaasResult<T>> {
  let lastError = "Erro inesperado";
  let lastStatus: number | undefined;

  // até 3 tentativas (429/5xx), backoff 800ms * tentativa
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          "access_token": apiKey(),
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      lastStatus = res.status;
      clearTimeout(timer);

      if (res.status === 429 || res.status >= 500) {
        lastError = res.status === 429 ? "Rate limit do Asaas" : `Erro Asaas ${res.status}`;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }
        return { ok: false, status: res.status, error: lastError };
      }

      const json = (await res.json().catch(() => null)) as T | null;

      if (!res.ok) {
        const apiErrors = (json as { errors?: { description?: string }[] } | null)?.errors;
        return {
          ok: false,
          status: res.status,
          error: apiErrors?.[0]?.description ?? `Erro Asaas ${res.status}`,
        };
      }

      return { ok: true, status: res.status, data: json as T };
    } catch (e) {
      clearTimeout(timer);
      lastError = e instanceof Error && e.name === "AbortError" ? "Timeout do Asaas" : "Falha de conexão com o Asaas";
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
        continue;
      }
    }
  }
  return { ok: false, status: lastStatus, error: lastError };
}

// ─────────────────────────── CLIENTES ───────────────────────────

interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email: string;
}

export async function upsertCustomer(input: {
  name: string;
  cpfCnpj: string;
  email: string;
  phone?: string | null;
}): Promise<AsaasResult<{ customerId: string }>> {
  const digits = input.cpfCnpj.replace(/\D/g, "");

  // busca por documento (anti-duplicidade)
  const search = await asaasFetch<{ data: AsaasCustomer[] }>(
    "GET",
    `/customers?cpfCnpj=${digits}&limit=1`,
  );
  if (!search.ok) return { ok: false, error: search.error, status: search.status };
  const existing = search.data?.data?.[0];
  if (existing) return { ok: true, data: { customerId: existing.id } };

  const created = await asaasFetch<{ id: string }>("POST", "/customers", {
    name: input.name,
    cpfCnpj: digits,
    email: input.email,
    ...(input.phone
      ? { phone: input.phone.replace(/\D/g, "").replace(/^(\d{2})(\d{8,9})$/, "$1$2") }
      : {}),
  });
  if (!created.ok || !created.data) return { ok: false, error: created.error, status: created.status };
  return { ok: true, data: { customerId: created.data.id } };
}

// ─────────────────────────── COBRANÇAS ───────────────────────────

export interface AsaasPixCharge {
  chargeId: string;
  dueDate: string;
  qrCode: string; // EMV copia-e-cola
}

/** Cobrança PIX única com vencimento em 3 dias. */
export async function createPixCharge(input: {
  customerId: string;
  valueCents: number;
  description: string;
  externalReference: string;
}): Promise<AsaasResult<AsaasPixCharge>> {
  const due = new Date(Date.now() + 3 * 24 * 3600_000);
  const dueDate = brtDateString(due);

  const created = await asaasFetch<{ id: string }>("POST", "/payments", {
    customer: input.customerId,
    billingType: "PIX",
    value: Number((input.valueCents / 100).toFixed(2)),
    dueDate,
    description: input.description,
    externalReference: input.externalReference,
  });
  if (!created.ok || !created.data) return { ok: false, error: created.error, status: created.status };
  const chargeId = created.data.id;

  const qr = await asaasFetch<{ payload: string }>("GET", `/payments/${chargeId}/pixQrCode`);
  return {
    ok: true,
    data: {
      chargeId,
      dueDate,
      qrCode: qr.data?.payload ?? "",
    },
  };
}

export async function deleteCharge(chargeId: string): Promise<AsaasResult<null>> {
  return asaasFetch<null>("DELETE", `/payments/${chargeId}`);
}

// ─────────────────────────── ASSINATURAS ───────────────────────────

export async function createSubscription(input: {
  customerId: string;
  valueCents: number;
  description: string;
  nextDueDate: string; // yyyy-mm-dd
  externalReference: string;
}): Promise<AsaasResult<{ subscriptionId: string }>> {
  return asaasFetch<{ id: string }>("POST", "/subscriptions", {
    customer: input.customerId,
    billingType: "PIX",
    value: Number((input.valueCents / 100).toFixed(2)),
    cycle: "MONTHLY",
    nextDueDate: input.nextDueDate,
    description: input.description,
    externalReference: input.externalReference,
  }).then((r) =>
    r.ok && r.data ? { ok: true, data: { subscriptionId: r.data.id } } : { ok: false, error: r.error, status: r.status },
  );
}

export async function deleteSubscription(subscriptionId: string): Promise<AsaasResult<null>> {
  return asaasFetch<null>("DELETE", `/subscriptions/${subscriptionId}`);
}

export async function deleteSubscriptionCharges(subscriptionId: string): Promise<AsaasResult<null>> {
  // remove cobranças pendentes da assinatura (usado quando cancelAtPeriodEnd)
  const list = await asaasFetch<{ data: { id: string; status: string }[] }>(
    "GET",
    `/payments?subscription=${subscriptionId}&status=PENDING&limit=100`,
  );
  if (!list.ok || !list.data) return { ok: false, error: list.error };
  for (const charge of list.data.data ?? []) {
    await deleteCharge(charge.id);
  }
  return { ok: true };
}
