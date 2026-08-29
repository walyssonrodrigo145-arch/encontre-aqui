import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, providerServices, providers, services } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { getAvailableSlots } from "@/server/services/availability";
import { Navbar, Footer, MobileTabBar, TabBarSpacer } from "@/components/navbar";
import { BookingForm } from "@/components/booking-form";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agendar serviço" };

export default async function AgendarPage({
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

  const [svcRows, slots] = await Promise.all([
    db
      .select({ id: services.id, name: services.name })
      .from(providerServices)
      .innerJoin(services, eq(providerServices.serviceId, services.id))
      .where(eq(providerServices.providerId, provider.id)),
    getAvailableSlots(provider.id, 14),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header gradiente mobile */}
      <div className="bg-brand-gradient px-4 pb-6 pt-5 md:hidden">
        <div className="flex items-center gap-2 text-white">
          <Link href={`/p/${provider.slug}`} className="rounded-full p-1.5 transition hover:bg-white/15" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-display text-lg font-bold">Agendar serviço</h1>
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 font-display text-sm font-bold text-white">
            {provider.displayName.slice(0, 1)}
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{provider.displayName}</p>
            <p className="text-xs text-white/70">{provider.headline}</p>
          </div>
        </div>
      </div>

      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:py-8">
        <h1 className="font-display mb-1 hidden text-center text-2xl font-extrabold text-slate-900 md:block">
          Agendar serviço
        </h1>
        <p className="mb-6 hidden text-center text-sm text-slate-500 md:block">
          Veja os horários livres na agenda de {provider.displayName}
        </p>
        {slots.length === 0 ? (
          <EmptyState
            icon={<span className="text-xl">📅</span>}
            title="Agenda não disponível"
            description="Este profissional ainda não configurou horários de atendimento. Envie uma mensagem para combinar diretamente."
          />
        ) : (
          <BookingForm
            providerId={provider.id}
            providerName={provider.displayName}
            providerSlug={provider.slug}
            services={svcRows}
            slots={slots}
            quoteId={Number(sp.orcamento) || undefined}
            quoteResponseId={Number(sp.resposta) || undefined}
            defaultAddress={customer.addressText ?? ""}
          />
        )}
      </main>
      <Footer />
      <TabBarSpacer />
      <MobileTabBar />
    </div>
  );
}
