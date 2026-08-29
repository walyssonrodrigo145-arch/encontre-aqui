import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, reports, reviews, users } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { EmptyState, Stars, StatusBadge } from "@/components/ui";
import { AdminReviewActions } from "@/components/admin-actions";

export const metadata = { title: "Admin — Avaliações" };

export default async function AdminReviewsPage() {
  const [rows, reportRows] = await Promise.all([
    db
      .select({
        review: reviews,
        authorName: users.name,
        providerName: providers.displayName,
        providerSlug: providers.slug,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.authorId, users.id))
      .innerJoin(providers, eq(reviews.providerId, providers.id))
      .orderBy(desc(reviews.createdAt))
      .limit(50),
    db
      .select({
        report: reports,
        reporterName: users.name,
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(eq(reports.status, "PENDING"))
      .orderBy(desc(reports.createdAt)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Moderação de avaliações</h1>
        <p className="text-sm text-slate-500">
          {reportRows.length} denúncia(s) pendente(s) · {rows.length} avaliações recentes
        </p>
      </div>

      {reportRows.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-red-500">🚩 Denúncias</h2>
          <ul className="space-y-2">
            {reportRows.map(({ report, reporterName }) => (
              <li key={report.id} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-medium text-slate-700">
                    {report.targetType} #{report.targetId} — reportado por {reporterName}
                  </p>
                  <p className="text-xs text-slate-400">&quot;{report.reason}&quot; · {formatDate(report.createdAt)}</p>
                </div>
                <StatusBadge status="PENDING" label="Pendente" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {rows.length === 0 ? (
        <EmptyState icon={<span>⭐</span>} title="Nenhuma avaliação ainda" />
      ) : (
        <ul className="space-y-2">
          {rows.map(({ review, authorName, providerName, providerSlug }) => (
            <li key={review.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    <Link href={`/p/${providerSlug}`} className="hover:text-[var(--primary)]">{providerName}</Link>
                    <span className="font-normal text-slate-400"> · avaliado por {authorName}</span>
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(review.createdAt)}</p>
                </div>
                <Stars rating={review.rating} />
              </div>
              {review.comment && <p className="mt-2 text-sm text-slate-600">{review.comment}</p>}
              <div className="mt-3 flex items-center justify-between">
                <StatusBadge
                  status={review.status}
                  label={review.status === "VISIBLE" ? "Visível" : review.status === "REMOVED" ? "Removida" : "Reportada"}
                />
                <AdminReviewActions reviewId={review.id} status={review.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
