import { and, desc, eq } from "drizzle-orm";
import { BadgeCheck, Check, CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { payments, providers, subscriptionPlans, subscriptions } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/utils";
import { SectionTitle, StatusBadge } from "@/components/ui";
import { CancelSubButton, SubscribeButtons } from "@/components/monetization-forms";

export const dynamic = "force-dynamic";

export const metadata = { title: "Minha assinatura" };

export default async function AssinaturaPage() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return null;

  const [plans, activeSub, paymentHistory] = await Promise.all([
    db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.sortOrder),
    db
      .select({
        sub: subscriptions,
        plan: subscriptionPlans,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(and(eq(subscriptions.providerId, provider.id), eq(subscriptions.status, "ACTIVE")))
      .orderBy(desc(subscriptions.id))
      .limit(1),
    db
      .select()
      .from(payments)
      .where(eq(payments.providerId, provider.id))
      .orderBy(desc(payments.createdAt))
      .limit(10),
  ]);

  const current = activeSub[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Assinatura</h1>
        <p className="text-sm text-slate-500">Escolha o plano ideal para o seu negócio</p>
      </div>

      {current && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-[var(--primary)] bg-[var(--primary-light)]/40 p-5">
          <div>
            <p className="inline-flex items-center gap-1.5 font-bold text-slate-800">
              <BadgeCheck size={17} className="text-[var(--primary)]" />
              Plano {current.plan.name}
            </p>
            <p className="text-sm text-slate-500">
              {formatMoney(current.plan.priceCents)}/mês · próxima renovação {formatDate(current.sub.currentPeriodEnd, false)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status="ACTIVE" label="Ativo" />
            <CancelSubButton />
          </div>
        </div>
      )}

      <section>
        <SectionTitle>Planos disponíveis</SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = current?.plan.id === plan.id;
            const features = [
              `${plan.maxPhotos} foto(s) no perfil`,
              `Portfólio com até ${plan.maxPortfolio} trabalhos`,
              plan.allowVideos ? "Vídeos no portfólio" : null,
              plan.searchBoost > 0 ? `+${Math.round(plan.searchBoost * 100)}% destaque nas buscas` : null,
              plan.featuredBadge ? "Selo de destaque no perfil" : null,
              plan.advancedStats ? "Estatísticas avançadas" : "Estatísticas básicas",
              plan.prioritySupport ? "Suporte prioritário" : null,
            ].filter(Boolean);

            return (
              <div
                key={plan.id}
                className={`card relative flex flex-col p-5 ${plan.slug === "profissional" ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : ""}`}
              >
                {plan.slug === "profissional" && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--primary)] px-3 py-0.5 text-[10px] font-bold text-white">
                    MAIS POPULAR
                  </span>
                )}
                <h3 className="font-bold text-slate-800">{plan.name}</h3>
                <p className="mt-1">
                  <span className="text-3xl font-extrabold text-slate-900">{formatMoney(plan.priceCents)}</span>
                  <span className="text-sm text-slate-400">/mês</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check size={15} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <button disabled className="btn-outline w-full">Plano atual</button>
                  ) : (
                    <SubscribeButtons planId={plan.id} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">
          💳 Pagamento via PIX ou cartão · Cancele quando quiser · Modo demo confirma na hora
        </p>
      </section>

      {paymentHistory.length > 0 && (
        <section>
          <SectionTitle>Histórico de pagamentos</SectionTitle>
          <ul className="card divide-y divide-slate-100">
            {paymentHistory.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <CreditCard size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{p.description}</p>
                    <p className="text-xs text-slate-400">
                      {formatDate(p.createdAt)} · {p.method}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{formatMoney(p.amountCents)}</span>
                  <StatusBadge
                    status={p.status}
                    label={p.status === "CONFIRMED" ? "Pago" : p.status === "PENDING" ? "Pendente" : p.status}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
