import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  portfolio,
  providerAvailability,
  providerServices,
  providers,
  services,
  subcategories,
} from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cadastro de prestador" };

export default async function ProviderOnboardingPage() {
  const session = await getVerifiedSession();
  if (!session) redirect("/entrar");
  if (session.role !== "PROVIDER") redirect(session.role === "ADMIN" ? "/admin" : "/app");

  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) redirect("/app");

  if (provider.status === "PENDING") {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl">⏳</span>
          <h1 className="text-2xl font-extrabold text-slate-900">Cadastro em análise</h1>
          <p className="mt-2 text-slate-500">
            Recebemos seu cadastro! Nossa equipe está verificando seus dados.
            Você será notificado assim que seu perfil for aprovado (normalmente em até 24h).
          </p>
          <Link href="/" className="btn-primary mt-6">Voltar ao início</Link>
        </main>
      </div>
    );
  }

  if (provider.status === "SUSPENDED" || provider.status === "REJECTED") {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">🚫</span>
          <h1 className="text-2xl font-extrabold text-slate-900">Perfil {provider.status === "REJECTED" ? "recusado" : "suspenso"}</h1>
          <p className="mt-2 text-slate-500">
            {provider.rejectionReason ?? "Entre em contato com o suporte para mais informações."}
          </p>
          <Link href="/" className="btn-primary mt-6">Voltar ao início</Link>
        </main>
      </div>
    );
  }

  const [cats, subs, allServices, myServices, myAvailability, myPortfolio] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select().from(subcategories),
    db.select().from(services),
    db.select({ serviceId: providerServices.serviceId }).from(providerServices).where(eq(providerServices.providerId, provider.id)),
    db.select().from(providerAvailability).where(eq(providerAvailability.providerId, provider.id)),
    db.select().from(portfolio).where(eq(portfolio.providerId, provider.id)),
  ]);

  // subcategorias efetivamente ligadas aos serviços escolhidos
  const myServiceIds = myServices.map((s) => s.serviceId);
  const mySubIds = new Set(
    allServices.filter((s) => myServiceIds.includes(s.id)).map((s) => s.subcategoryId),
  );

  const catalog = cats.map((c) => ({
    id: c.id,
    name: c.name,
    subcategories: subs
      .filter((s) => s.categoryId === c.id)
      .map((s) => ({
        id: s.id,
        name: s.name,
        services: allServices
          .filter((v) => v.subcategoryId === s.id)
          .map((v) => ({ id: v.id, name: v.name })),
      })),
  }));

  const availabilityMap: Record<number, { startTime: string; endTime: string }> = {};
  for (const a of myAvailability) {
    availabilityMap[a.weekday] = { startTime: a.startTime, endTime: a.endTime };
  }

  const [firstLink] = await db
    .select()
    .from(providerServices)
    .where(eq(providerServices.providerId, provider.id))
    .limit(1);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="mb-1 text-center text-2xl font-extrabold text-slate-900">
          Complete seu perfil profissional
        </h1>
        <p className="mb-8 text-center text-sm text-slate-500">
          Perfis completos recebem até 3x mais solicitações
        </p>
        <OnboardingWizard
          step={Math.min(provider.onboardingStep, 8)}
          categories={catalog}
          initial={{
            displayName: provider.displayName,
            city: provider.city ?? "",
            state: provider.state ?? "",
            neighborhood: provider.neighborhood ?? "",
            cep: provider.cep ?? "",
            addressText: provider.addressText ?? "",
            lat: provider.lat ?? -18.9123,
            lng: provider.lng ?? -41.9496,
            headline: provider.headline ?? "",
            bio: provider.bio ?? "",
            experienceYears: provider.experienceYears,
            certifications: provider.certifications ?? "",
            selectedSubcategoryIds: [...mySubIds],
            selectedServiceIds: myServiceIds,
            priceType: (firstLink?.priceType ?? "ON_QUOTE") as "FIXED" | "RANGE" | "ON_QUOTE",
            priceMin: firstLink?.priceMin != null ? (firstLink.priceMin / 100).toString() : "",
            priceMax: firstLink?.priceMax != null ? (firstLink.priceMax / 100).toString() : "",
            emergency: provider.emergency,
            serviceRadiusKm: provider.serviceRadiusKm,
            availability: availabilityMap,
            portfolio: myPortfolio.map((p) => ({ description: p.description ?? "" })),
          }}
        />
      </main>
    </div>
  );
}
