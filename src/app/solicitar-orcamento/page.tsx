import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, providerServices, providers, services } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { Navbar, Footer, MobileTabBar, TabBarSpacer } from "@/components/navbar";
import { QuoteRequestForm } from "@/components/quote-request-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Solicitar orçamento" };

export default async function SolicitarOrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, sp] = await Promise.all([getVerifiedSession(), searchParams]);
  if (!session) redirect("/entrar");
  if (session.role !== "CUSTOMER") redirect("/prestador/painel");

  const providerId = Number(sp.prestador);
  if (!Number.isFinite(providerId)) notFound();

  const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
  if (!customer) redirect("/app");

  const [provider] = await db.select().from(providers).where(eq(providers.id, providerId)).limit(1);
  if (!provider || provider.status !== "APPROVED") notFound();

  const svcRows = await db
    .select({ id: services.id, name: services.name })
    .from(providerServices)
    .innerJoin(services, eq(providerServices.serviceId, services.id))
    .where(eq(providerServices.providerId, provider.id));

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header gradiente mobile */}
      <div className="bg-brand-gradient px-4 pb-6 pt-5 md:hidden">
        <div className="flex items-center gap-2 text-white">
          <Link href={`/p/${provider.slug}`} className="rounded-full p-1.5 transition hover:bg-white/15" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-lg font-bold">Solicitar orçamento</h1>
        </div>
        <p className="mt-2 pl-1 text-sm text-white/80">
          Para <b>{provider.displayName}</b> · {provider.headline}
        </p>
      </div>

      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:py-8">
        <h1 className="font-display mb-6 hidden text-center text-2xl font-extrabold text-slate-900 md:block">
          Solicitar orçamento
        </h1>
        <QuoteRequestForm providerId={provider.id} providerName={provider.displayName} services={svcRows} />
      </main>
      <Footer />
      <TabBarSpacer />
      <MobileTabBar />
    </div>
  );
}
