"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { customers, providers, quoteResponses, quotes } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { notify } from "@/server/services/notifications";
import { rateLimit } from "@/server/rate-limit";
import { quoteRequestSchema, quoteResponseSchema } from "@/lib/validations";
import { formatMoney, toNumberOrUndefined } from "@/lib/utils";

export interface ActionState {
  error?: string;
  success?: string;
  quoteId?: number;
}

export async function createQuoteAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("CUSTOMER").catch(() => null);
  if (!session) return { error: "Entre com uma conta de cliente para solicitar orçamento." };

  const limited = rateLimit(`quote:${session.userId}`, 20, 60 * 60 * 1000);
  if (!limited) return { error: "Muitas solicitações. Tente novamente mais tarde." };

  const parsed = quoteRequestSchema.safeParse({
    providerId: Number(formData.get("providerId")),
    serviceId: formData.get("serviceId") ? Number(formData.get("serviceId")) : undefined,
    description: formData.get("description"),
    urgency: formData.get("urgency") ?? "NORMAL",
    desiredDate: formData.get("desiredDate") || undefined,
    addressText: formData.get("addressText"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { providerId, serviceId, description, urgency, desiredDate, addressText } = parsed.data;

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, session.userId))
    .limit(1);
  if (!customer) return { error: "Perfil de cliente não encontrado." };

  const [provider] = await db
    .select({ id: providers.id, userId: providers.userId, status: providers.status })
    .from(providers)
    .where(eq(providers.id, providerId))
    .limit(1);
  if (!provider || provider.status !== "APPROVED") return { error: "Profissional indisponível." };

  const [quote] = await db
    .insert(quotes)
    .values({
      customerId: customer.id,
      providerId,
      serviceId,
      description,
      urgency,
      desiredDate,
      addressText,
      lat: customer.lat,
      lng: customer.lng,
    })
    .returning();

  await notify({
    userId: provider.userId,
    type: "NEW_QUOTE_REQUEST",
    title: "Nova solicitação de orçamento",
    body: description.slice(0, 100),
    link: "/prestador/solicitacoes",
    referenceType: "QUOTE",
    referenceId: quote!.id,
  });

  revalidatePath("/app/solicitacoes");
  return { success: "Solicitação enviada! Aguarde o retorno do profissional.", quoteId: quote!.id };
}

export async function respondQuoteAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("PROVIDER").catch(() => null);
  if (!session) return { error: "Acesso negado." };

  const priceRaw = String(formData.get("price") ?? "").replace(",", ".").trim();
  const priceNumber = priceRaw === "" ? NaN : Number(priceRaw);
  const parsed = quoteResponseSchema.safeParse({
    quoteId: Number(formData.get("quoteId")),
    price: Number.isFinite(priceNumber) ? Math.round(priceNumber * 100) : -1,
    estimatedDays: toNumberOrUndefined(formData.get("estimatedDays")),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const [provider] = await db
    .select()
    .from(providers)
    .where(eq(providers.userId, session.userId))
    .limit(1);
  if (!provider) return { error: "Perfil de prestador não encontrado." };

  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, parsed.data.quoteId), eq(quotes.providerId, provider.id)))
    .limit(1);
  if (!quote) return { error: "Solicitação não encontrada." };
  if (quote.status !== "OPEN") return { error: "Esta solicitação já foi respondida." };

  const [customerUser] = await db
    .select({ userId: customers.userId })
    .from(customers)
    .where(eq(customers.id, quote.customerId))
    .limit(1);

  await db.insert(quoteResponses).values({
    quoteId: quote.id,
    providerId: provider.id,
    price: parsed.data.price,
    estimatedDays: parsed.data.estimatedDays,
    note: parsed.data.note,
  });
  await db.update(quotes).set({ status: "ANSWERED" }).where(eq(quotes.id, quote.id));

  if (customerUser) {
    await notify({
      userId: customerUser.userId,
      type: "QUOTE_RESPONSE",
      title: "Você recebeu um orçamento!",
      body: `${provider.displayName} respondeu: ${formatMoney(parsed.data.price)}`,
      link: `/app/orcamentos/${quote.id}`,
      referenceType: "QUOTE",
      referenceId: quote.id,
    });
  }

  revalidatePath("/prestador/solicitacoes");
  return { success: "Orçamento enviado ao cliente!" };
}

export async function acceptQuoteAction(quoteId: number, responseId: number) {
  const session = await requireRole("CUSTOMER");

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, session.userId))
    .limit(1);
  if (!customer) return;

  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.customerId, customer.id)))
    .limit(1);
  if (!quote || quote.status !== "ANSWERED") return;

  const [response] = await db
    .select()
    .from(quoteResponses)
    .where(and(eq(quoteResponses.id, responseId), eq(quoteResponses.quoteId, quoteId)))
    .limit(1);
  if (!response) return;

  await db.update(quoteResponses).set({ status: "ACCEPTED" }).where(eq(quoteResponses.id, responseId));

  // rejeita as demais propostas
  const others = await db
    .select({ id: quoteResponses.id })
    .from(quoteResponses)
    .where(and(eq(quoteResponses.quoteId, quoteId)));
  for (const o of others) {
    if (o.id !== responseId) {
      await db.update(quoteResponses).set({ status: "REJECTED" }).where(eq(quoteResponses.id, o.id));
    }
  }

  await db.update(quotes).set({ status: "ACCEPTED" }).where(eq(quotes.id, quoteId));

  const [providerUser] = await db
    .select({ userId: providers.userId })
    .from(providers)
    .where(eq(providers.id, quote.providerId))
    .limit(1);

  if (providerUser) {
    await notify({
      userId: providerUser.userId,
      type: "QUOTE_ACCEPTED",
      title: "Seu orçamento foi aceito!",
      body: "O cliente aceitou sua proposta. Combine os detalhes pelo chat.",
      link: "/prestador/solicitacoes",
      referenceType: "QUOTE",
      referenceId: quoteId,
    });
  }

  revalidatePath(`/app/orcamentos/${quoteId}`);
}
