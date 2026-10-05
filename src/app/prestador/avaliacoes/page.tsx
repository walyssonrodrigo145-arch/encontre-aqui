import { and, desc, eq } from "drizzle-orm";
import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { providers, reviews, users } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Avatar, EmptyState, Stars } from "@/components/ui";
import { ProviderReplyForm, ReportReviewButton } from "@/components/review-interactions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Minhas avaliações" };

export default async function ProviderReviewsPage() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return null;

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      providerReply: reviews.providerReply,
      authorName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.authorId, users.id))
    .where(and(eq(reviews.providerId, provider.id), eq(reviews.status, "VISIBLE")))
    .orderBy(desc(reviews.createdAt));

  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: rows.filter((r) => r.rating === star).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Avaliações</h1>
        <p className="text-sm text-slate-500">O que os clientes dizem sobre você</p>
      </div>

      {rows.length > 0 && (
        <div className="card flex flex-wrap items-center gap-6 border-[var(--primary)]/15 bg-[var(--primary-soft)]/40 p-5">
        <div className="text-center">
          <p className="font-display text-4xl font-extrabold text-slate-900">
            {provider.ratingAvg.toFixed(1).replace(".", ",")}
          </p>
          <Stars rating={provider.ratingAvg} />
          <p className="mt-1 text-xs text-slate-400">{provider.ratingCount} avaliações</p>
        </div>
        <div className="flex-1 space-y-1">
          {dist.map((d) => (
            <div key={d.star} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-slate-500">{d.star}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${rows.length ? (d.count / rows.length) * 100 : 0}%` }}
                />
              </div>
              <span className="w-6 text-right text-slate-400">{d.count}</span>
            </div>
          ))}
        </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Star size={20} />}
          title="Nenhuma avaliação ainda"
          description="Conclua serviços para receber suas primeiras avaliações."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--primary)]/5">
              <div className="flex items-center gap-2">
                <Avatar name={r.authorName} size={34} />
                <div>
                  <p className="text-sm font-semibold text-slate-700">{r.authorName}</p>
                  <p className="text-xs text-slate-400">{formatDate(r.createdAt, false)}</p>
                </div>
                <span className="ml-auto">
                  <Stars rating={r.rating} />
                </span>
              </div>
              {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
              {r.providerReply ? (
                <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-sm text-slate-600">
                  <b>Sua resposta:</b> {r.providerReply}
                </p>
              ) : (
                <ProviderReplyForm reviewId={r.id} />
              )}
              <div className="mt-2 text-right">
                <ReportReviewButton reviewId={r.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
