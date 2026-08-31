import { asc, eq } from "drizzle-orm";
import { CalendarDays, FolderOpen, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import {
  categories,
  portfolio,
  providerAvailability,
  providerServices,
  providers,
  services,
  subcategories,
  subscriptionPlans,
} from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { ProfileTabs, type ProfileTab } from "@/components/profile-tabs";
import {
  AvailabilityEditor,
  PortfolioManager,
  ServicesManager,
  type CatalogService,
} from "@/components/provider-profile-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meu perfil" };

const DEFAULT_PORTFOLIO_LIMIT = 6;

export default async function ProviderProfilePage() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) return null;

  const [rules, links, portfolioRows, plan, catalog] = await Promise.all([
    db
      .select()
      .from(providerAvailability)
      .where(eq(providerAvailability.providerId, provider.id)),
    db
      .select({
        serviceId: providerServices.serviceId,
        priceType: providerServices.priceType,
        priceMin: providerServices.priceMin,
        priceMax: providerServices.priceMax,
      })
      .from(providerServices)
      .where(eq(providerServices.providerId, provider.id)),
    db.select().from(portfolio).where(eq(portfolio.providerId, provider.id)).orderBy(asc(portfolio.sortOrder)),
    provider.planId
      ? db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, provider.planId)).limit(1)
      : Promise.resolve([]),
    db
      .select({
        id: services.id,
        name: services.name,
        subName: subcategories.name,
        catName: categories.name,
      })
      .from(services)
      .innerJoin(subcategories, eq(services.subcategoryId, subcategories.id))
      .innerJoin(categories, eq(subcategories.categoryId, categories.id))
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(subcategories.name), asc(services.name)),
  ]);

  const activePlan = plan[0] ?? null;
  const portfolioLimit = activePlan?.maxPortfolio ?? DEFAULT_PORTFOLIO_LIMIT;

  const catalogServices: CatalogService[] = catalog.map((c) => ({
    id: c.id,
    name: c.name,
    subName: c.subName,
    catName: c.catName,
  }));

  const tabs: ProfileTab[] = [
    {
      id: "disponibilidade",
      title: "Disponibilidade",
      description: "Dias, horários e duração",
      icon: <CalendarDays size={19} />,
      content: (
        <AvailabilityEditor
          initialRules={rules.map((r) => ({
            weekday: r.weekday,
            startTime: r.startTime,
            endTime: r.endTime,
            slotMinutes: r.slotMinutes,
          }))}
          initialEmergency={provider.emergency}
          initialRadius={provider.serviceRadiusKm}
          slug={provider.slug}
        />
      ),
    },
    {
      id: "servicos",
      title: "Serviços e preços",
      description: "Gerencie seus serviços",
      icon: <Wrench size={19} />,
      content: (
        <ServicesManager catalog={catalogServices} initialLinks={links} slug={provider.slug} />
      ),
    },
    {
      id: "portfolio",
      title: "Portfólio",
      description: "Fotos e trabalhos realizados",
      icon: <FolderOpen size={19} />,
      content: (
        <PortfolioManager
          initialItems={portfolioRows.map((p) => ({
            id: p.id,
            mediaUrl: p.mediaUrl,
            mediaType: p.mediaType,
            description: p.description,
          }))}
          limit={portfolioLimit}
          planName={activePlan?.name ?? null}
          slug={provider.slug}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Meu perfil</h1>
        <p className="text-sm text-slate-500">
          Gerencie suas informações públicas e preferências de atendimento.
        </p>
      </div>

      <ProfileTabs tabs={tabs} />
    </div>
  );
}
