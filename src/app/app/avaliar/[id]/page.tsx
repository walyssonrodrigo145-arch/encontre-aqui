import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appointments, customers, providers } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { Navbar, Footer } from "@/components/navbar";
import { ReviewForm } from "@/components/review-form";

export const metadata = { title: "Avaliar serviço" };

export default async function AvaliarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appointmentId = Number(id);
  if (!Number.isFinite(appointmentId)) notFound();

  const session = await getVerifiedSession();
  if (!session || session.role !== "CUSTOMER") redirect("/entrar");

  const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
  if (!customer) redirect("/app");

  const [row] = await db
    .select({
      appointment: appointments,
      providerName: providers.displayName,
      providerSlug: providers.slug,
    })
    .from(appointments)
    .innerJoin(providers, eq(appointments.providerId, providers.id))
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.customerId, customer.id),
        eq(appointments.status, "COMPLETED"),
      ),
    )
    .limit(1);

  if (!row) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <h1 className="text-center text-2xl font-extrabold text-slate-900">Como foi sua experiência?</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Serviço com <Link href={`/p/${row.providerSlug}`} className="font-semibold text-[var(--primary)]">{row.providerName}</Link>
        </p>
        <div className="mt-6">
          <ReviewForm appointmentId={appointmentId} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
