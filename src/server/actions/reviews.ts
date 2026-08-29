"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { appointments, customers, providers, reports, reviews } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { notify } from "@/server/services/notifications";
import { rateLimit } from "@/server/rate-limit";
import { reviewSchema } from "@/lib/validations";
import { toNumberOrUndefined } from "@/lib/utils";

export interface ReviewState {
  error?: string;
  success?: string;
}

export async function createReviewAction(
  _prev: ReviewState | undefined,
  formData: FormData,
): Promise<ReviewState> {
  const session = await requireRole("CUSTOMER").catch(() => null);
  if (!session) return { error: "Acesso negado." };

  const limited = rateLimit(`review:${session.userId}`, 10, 60 * 60 * 1000);
  if (!limited) return { error: "Muitas tentativas. Aguarde." };

  const parsed = reviewSchema.safeParse({
    appointmentId: toNumberOrUndefined(formData.get("appointmentId")) ?? -1,
    rating: toNumberOrUndefined(formData.get("rating")) ?? -1,
    quality: toNumberOrUndefined(formData.get("quality")),
    punctuality: toNumberOrUndefined(formData.get("punctuality")),
    service: toNumberOrUndefined(formData.get("service")),
    costBenefit: toNumberOrUndefined(formData.get("costBenefit")),
    comment: String(formData.get("comment") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
  if (!customer) return { error: "Perfil não encontrado." };

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, parsed.data.appointmentId),
        eq(appointments.customerId, customer.id),
        eq(appointments.status, "COMPLETED"),
      ),
    )
    .limit(1);

  if (!appointment) {
    return { error: "Só é possível avaliar após a conclusão real do serviço." };
  }

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.appointmentId, appointment.id))
    .limit(1);
  if (existing) return { error: "Você já avaliou este serviço." };

  await db.insert(reviews).values({
    appointmentId: appointment.id,
    authorId: session.userId,
    providerId: appointment.providerId,
    rating: parsed.data.rating,
    quality: parsed.data.quality,
    punctuality: parsed.data.punctuality,
    service: parsed.data.service,
    costBenefit: parsed.data.costBenefit,
    comment: parsed.data.comment,
  });

  await db.update(appointments).set({ isReviewed: true }).where(eq(appointments.id, appointment.id));

  // recalcula média
  const [agg] = await db
    .select({
      avg: sql<number>`avg(${reviews.rating})`,
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .where(and(eq(reviews.providerId, appointment.providerId), eq(reviews.status, "VISIBLE")));

  await db
    .update(providers)
    .set({ ratingAvg: agg?.avg ?? 0, ratingCount: agg?.count ?? 0 })
    .where(eq(providers.id, appointment.providerId));

  const [p] = await db.select({ userId: providers.userId }).from(providers).where(eq(providers.id, appointment.providerId)).limit(1);
  if (p) {
    await notify({
      userId: p.userId,
      type: "NEW_REVIEW",
      title: `Nova avaliação: ${parsed.data.rating}★`,
      body: parsed.data.comment?.slice(0, 80) ?? "Um cliente avaliou seu serviço.",
      link: "/prestador/avaliacoes",
      referenceType: "REVIEW",
      referenceId: appointment.id,
    });
  }

  revalidatePath("/app/agendamentos");
  return { success: "Avaliação enviada. Obrigado pelo feedback!" };
}

export async function reportReviewAction(reviewId: number, reason: string) {
  let session = await requireRole("PROVIDER").catch(() => null);
  if (!session) session = await requireRole("CUSTOMER").catch(() => null);
  if (!session) return;
  await db.insert(reports).values({
    reporterId: session.userId,
    targetType: "REVIEW",
    targetId: reviewId,
    reason: reason.slice(0, 500),
  });
}

export async function replyReviewAction(reviewId: number, reply: string): Promise<{ error?: string }> {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select({ id: providers.id }).from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return { error: "Perfil não encontrado." };

  const [review] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.id, reviewId), eq(reviews.providerId, provider.id)))
    .limit(1);
  if (!review) return { error: "Avaliação não encontrada." };

  await db.update(reviews).set({ providerReply: reply.slice(0, 500) }).where(eq(reviews.id, reviewId));
  revalidatePath("/prestador/avaliacoes");
  return {};
}
