"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { conversations, customers, messages, providers } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { notify } from "@/server/services/notifications";
import { rateLimit } from "@/server/rate-limit";

export interface ChatState {
  error?: string;
  conversationId?: number;
}

export async function sendMessageAction(
  _prev: ChatState | undefined,
  formData: FormData,
): Promise<ChatState> {
  let session = await requireRole("CUSTOMER").catch(() => null);
  if (!session) session = await requireRole("PROVIDER").catch(() => null);
  if (!session) return { error: "Faça login para conversar." };

  const limited = rateLimit(`msg:${session.userId}`, 50, 60 * 1000);
  if (!limited) return { error: "Você está enviando mensagens rápido demais. Aguarde um pouco." };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Mensagem vazia." };
  if (content.length > 2000) return { error: "Mensagem muito longa (máx. 2000 caracteres)." };

  let conversationId = Number(formData.get("conversationId")) || undefined;
  const targetProviderId = Number(formData.get("providerId")) || undefined;

  if (!conversationId && targetProviderId) {
    // cliente iniciando conversa com prestador
    const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
    if (!customer) return { error: "Perfil de cliente não encontrado." };

    // moderação: prestador suspenso/rejeitado não recebe novas conversas
    const [targetProvider] = await db
      .select({ status: providers.status })
      .from(providers)
      .where(eq(providers.id, targetProviderId))
      .limit(1);
    if (!targetProvider || targetProvider.status !== "APPROVED") {
      return { error: "Este profissional não está disponível para contato." };
    }

    let [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.customerId, customer.id), eq(conversations.providerId, targetProviderId)))
      .limit(1);
    if (!conv) {
      [conv] = await db
        .insert(conversations)
        .values({ customerId: customer.id, providerId: targetProviderId })
        .returning();
    }
    conversationId = conv!.id;
  }

  if (!conversationId) return { error: "Conversa inválida." };

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv) return { error: "Conversa não encontrada." };

  // autorização
  let authorized = false;
  let recipientUserId: number | null = null;
  if (session.role === "CUSTOMER") {
    const [c] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, session.userId)).limit(1);
    authorized = !!c && c.id === conv.customerId;
    const [p] = await db.select({ userId: providers.userId }).from(providers).where(eq(providers.id, conv.providerId)).limit(1);
    recipientUserId = p?.userId ?? null;
  } else {
    const [p] = await db.select({ id: providers.id }).from(providers).where(eq(providers.userId, session.userId)).limit(1);
    authorized = !!p && p.id === conv.providerId;
    const [c] = await db.select({ userId: customers.userId }).from(customers).where(eq(customers.id, conv.customerId)).limit(1);
    recipientUserId = c?.userId ?? null;
  }
  if (!authorized) return { error: "Acesso negado." };

  await db.insert(messages).values({
    conversationId,
    senderId: session.userId,
    content,
  });
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));

  if (recipientUserId) {
    await notify({
      userId: recipientUserId,
      type: "NEW_MESSAGE",
      title: `Nova mensagem de ${session.name}`,
      body: content.slice(0, 80),
      link: `/mensagens/${conversationId}`,
      referenceType: "CONVERSATION",
      referenceId: conversationId,
    });
  }

  revalidatePath(`/mensagens/${conversationId}`);
  return { conversationId };
}
