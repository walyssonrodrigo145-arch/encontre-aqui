import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { ReactNode } from "react";
import { ClipboardCheck, MapPin, Star, Users } from "lucide-react";
import { db } from "@/lib/db";
import {
  categories,
  providerServices,
  providers,
  reviews,
  services,
  subcategories,
  users,
} from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { Footer, MobileTabBar, Navbar, TabBarSpacer } from "@/components/navbar";
import { HeroSection } from "@/components/home/hero-section";
import { PopularCategories } from "@/components/home/popular-categories";
import { FeaturedProfessionals } from "@/components/home/featured-professionals";
import { HowItWorks } from "@/components/home/how-it-works";
import { Benefits } from "@/components/home/benefits";
import { TrustSection } from "@/components/home/trust-section";
import { ProvidersCta } from "@/components/home/providers-cta";
import { Testimonials } from "@/components/home/testimonials";
import { Faq } from "@/components/home/faq";
import { FinalCta } from "@/components/home/final-cta";
import { searchProviders } from "@/server/services/search";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return <LandingContent />;
}

async function LandingContent() {
  const session = await getVerifiedSession();

  const [catRows, featured, stats, testimonials] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        icon: categories.icon,
        total: sql<number>`count(distinct ${providerServices.providerId})`,
      })
      .from(categories)
      .innerJoin(subcategories, eq(subcategories.categoryId, categories.id))
      .innerJoin(services, eq(services.subcategoryId, subcategories.id))
      .innerJoin(providerServices, eq(providerServices.serviceId, services.id))
      .innerJoin(
        providers,
        and(eq(providers.id, providerServices.providerId), eq(providers.status, "APPROVED")),
      )
      .where(eq(categories.isActive, true))
      .groupBy(categories.id, categories.name, categories.slug, categories.icon, categories.sortOrder)
      .orderBy(asc(categories.sortOrder)),
    searchProviders({ sort: "rating" }),
    db
      .select({
        total: sql<number>`count(*)`,
        avgRating: sql<number>`coalesce(avg(case when ${providers.ratingCount} > 0 then ${providers.ratingAvg} end), 0)`,
        done: sql<number>`coalesce(sum(${providers.completedJobs}), 0)`,
        cities: sql<number>`count(distinct ${providers.city})`,
      })
      .from(providers)
      .where(eq(providers.status, "APPROVED")),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        authorName: users.name,
        providerName: providers.displayName,
        serviceName: sql<string | null>`(
          select s.name from services s
          join appointments a on a.service_id = s.id
          where a.id = ${reviews.appointmentId}
        )`,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.authorId, users.id))
      .innerJoin(providers, eq(reviews.providerId, providers.id))
      .where(eq(reviews.status, "VISIBLE"))
      .orderBy(desc(reviews.rating), desc(reviews.createdAt))
      .limit(6),
  ]);

  const trustStats = {
    total: Number(stats[0]?.total ?? 0),
    avgRating: Number(stats[0]?.avgRating ?? 0),
    done: Number(stats[0]?.done ?? 0),
    cities: Number(stats[0]?.cities ?? 0),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main>
        {/* 2. HERO + 3. BUSCA */}
        <HeroSection
          isProvider={session?.role === "PROVIDER"}
          firstName={session?.name.split(" ")[0] ?? null}
          featured={featured}
        />

        {/* 4. INDICADORES DE CONFIANÇA (dados reais) */}
        <TrustStrip
          stats={[
            { icon: <Users size={20} />, label: "Profissionais cadastrados", value: `+${trustStats.total}` },
            trustStats.avgRating > 0
              ? {
                  icon: <Star size={20} />,
                  label: "Avaliação média",
                  value: `${trustStats.avgRating.toFixed(1).replace(".", ",")}/5`,
                }
              : { icon: <Star size={20} />, label: "Avaliações reais", value: "✓" },
            { icon: <ClipboardCheck size={20} />, label: "Serviços realizados", value: `+${trustStats.done}` },
            { icon: <MapPin size={20} />, label: "Cidades atendidas", value: String(trustStats.cities) },
          ]}
        />

        {/* 5. CATEGORIAS POPULARES */}
        <PopularCategories categories={catRows} />

        {/* 6. PROFISSIONAIS EM DESTAQUE */}
        <FeaturedProfessionals providers={featured.slice(0, 8)} />

        {/* 7. COMO FUNCIONA */}
        <HowItWorks />

        {/* 8. BENEFÍCIOS */}
        <Benefits />

        {/* 9. SEGURANÇA E CONFIANÇA */}
        <TrustSection />

        {/* 10. PARA PROFISSIONAIS */}
        <ProvidersCta />

        {/* 11. DEPOIMENTOS */}
        <Testimonials reviews={testimonials} />

        {/* 12. FAQ */}
        <Faq />

        {/* 13. CTA FINAL */}
        <FinalCta />
      </main>

      {/* 14. FOOTER */}
      <Footer />
      <TabBarSpacer />
      <MobileTabBar />
    </div>
  );
}

/** Faixa de indicadores reais logo abaixo do hero */
function TrustStrip({ stats }: { stats: { icon: ReactNode; label: string; value: string }[] }) {
  return (
    <section aria-label="Indicadores de confiança" className="border-y border-[var(--border)] bg-white">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-5 px-4 py-6 md:grid-cols-4 md:px-6 md:py-7 lg:divide-x lg:divide-[var(--border)]">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-center gap-3.5 text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
              {s.icon}
            </span>
            <span>
              <span className="font-display block text-xl font-extrabold leading-tight text-slate-900 md:text-2xl">
                {s.value}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500 md:text-[13px]">{s.label}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

