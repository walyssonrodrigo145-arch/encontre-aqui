import Link from "next/link";
import { eq } from "drizzle-orm";
import { Check, FolderOpen, UserCog } from "lucide-react";
import { db } from "@/lib/db";
import { categories, portfolio, providerServices, providers, services, subcategories } from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { formatMoney } from "@/lib/utils";
import { SectionTitle } from "@/components/ui";
import { FadeIn } from "@/components/motion";

export const metadata = { title: "Meus serviços" };
export const dynamic = "force-dynamic";

export default async function ProviderServicesPage() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return null;

  const [svcRows, portfolioRows] = await Promise.all([
    db
      .select({
        serviceName: services.name,
        subName: subcategories.name,
        catName: categories.name,
        priceType: providerServices.priceType,
        priceMin: providerServices.priceMin,
        priceMax: providerServices.priceMax,
      })
      .from(providerServices)
      .innerJoin(services, eq(providerServices.serviceId, services.id))
      .innerJoin(subcategories, eq(services.subcategoryId, subcategories.id))
      .innerJoin(categories, eq(subcategories.categoryId, categories.id))
      .where(eq(providerServices.providerId, provider.id)),
    db.select().from(portfolio).where(eq(portfolio.providerId, provider.id)),
  ]);

  const grouped = new Map<string, typeof svcRows>();
  for (const s of svcRows) {
    const list = grouped.get(s.catName) ?? [];
    list.push(s);
    grouped.set(s.catName, list);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold text-slate-900">Meus serviços</h2>
        <p className="text-sm text-slate-500">
          {svcRows.length} serviço(s) · {portfolioRows.length} trabalho(s) no portfólio
        </p>
      </div>

      <FadeIn>
        <section className="card p-5">
          <SectionTitle sub="Edite serviços e preços em “Meu perfil”">Catálogo</SectionTitle>
          <Link href="/prestador/perfil" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline">
            <UserCog size={13} /> Editar serviços e preços
          </Link>
          {grouped.size === 0 ? (
            <p className="text-sm text-slate-400">Nenhum serviço cadastrado.</p>
          ) : (
            <div className="space-y-5">
              {[...grouped.entries()].map(([cat, list]) => (
                <div key={cat}>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{cat}</p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {list.map((s) => (
                      <li key={`${s.subName}-${s.serviceName}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                            <Check size={12} strokeWidth={3} />
                          </span>
                          {s.serviceName}
                        </span>
                        <span className="ml-2 shrink-0 text-xs font-semibold text-slate-500">
                          {s.priceType === "ON_QUOTE" && "Sob orçamento"}
                          {s.priceType === "RANGE" && s.priceMin != null && s.priceMax != null &&
                            `${formatMoney(s.priceMin)}–${formatMoney(s.priceMax)}`}
                          {s.priceType === "FIXED" && s.priceMin != null && formatMoney(s.priceMin)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </FadeIn>

      <FadeIn delay={0.05}>
        <section className="card p-5">
          <SectionTitle sub="Trabalhos que aparecem no seu perfil público">Portfólio</SectionTitle>
          {portfolioRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-10 text-center">
              <FolderOpen size={24} className="mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">Nenhum trabalho adicionado ainda.</p>
              <Link href="/prestador/perfil" className="mt-1 text-xs font-semibold text-[var(--primary)] hover:underline">
                Adicionar fotos em “Meu perfil” →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {portfolioRows.map((item) => (
                <figure key={item.id} className="overflow-hidden rounded-xl border border-[var(--border)] bg-slate-50">
                  {item.mediaType === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.mediaUrl}
                      alt={item.description ?? "Trabalho realizado"}
                      loading="lazy"
                      className="h-24 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 items-center justify-center bg-gradient-to-br from-[var(--primary-soft)] to-slate-100 text-3xl">
                      🎬
                    </div>
                  )}
                  {item.description && (
                    <figcaption className="p-2 text-xs text-slate-500">{item.description}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </section>
      </FadeIn>
    </div>
  );
}
