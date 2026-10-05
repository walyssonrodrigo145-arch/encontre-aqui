import Link from "next/link";
import { Flag, Percent, Star, X } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, reports, reviews, users } from "@/lib/schema";
import { formatDate } from "@/lib/utils";
import { EmptyState, Stars, StatusBadge } from "@/components/ui";
import { AdminReviewActions } from "@/components/admin-actions";
import { AdminPageHeader, AdminStat } from "@/components/admin-ui";

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

  const avg = rows.length > 0 ? rows.reduce((s, r) => s + r.review.rating, 0) / rows.length : 0;
  const removed = rows.filter((r) => r.review.status === "REMOVED").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Moderação de avaliações" subtitle="Denúncias e conteúdo publicado na plataforma" />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStat label="Denúncias pendentes" value={reportRows.length} icon={<Flag size={18} />} tile="bg-red-50 text-red-500" sub="exigem análise" />
        <AdminStat label="Avaliações recentes" value={rows.length} icon={<Star size={18} />} tile="bg-amber-50 text-amber-600" sub="últimas 50" />
        <AdminStat label="Média geral" value={avg.toFixed(1).replace(".", ",")} icon={<Percent size={18} />} tile="bg-sky-50 text-sky-600" sub="das avaliações recentes" />
        <AdminStat label="Removidas" value={removed} icon={<X size={18} />} tile="bg-slate-100 text-slate-500" sub="pela moderação" />
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
            <li key={review.id} className="card p-4 transition-all duration-200 hover:shadow-md hover:shadow-[var(--primary)]/5">
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
