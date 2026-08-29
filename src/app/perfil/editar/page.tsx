import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, providers, users } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { Navbar, Footer, MobileTabBar, TabBarSpacer } from "@/components/navbar";
import { AvatarUpload } from "@/components/avatar-upload";
import { ProfileFullForm } from "@/components/profile-full-form";

export const metadata = { title: "Editar perfil" };
export const dynamic = "force-dynamic";

export default async function EditarPerfilPage() {
  const session = await getVerifiedSession();
  if (!session) redirect("/entrar");

  const [me] = await db
    .select({ name: users.name, phone: users.phone, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!me) redirect("/entrar");

  let customerData = { city: "", state: "", addressText: "" };
  if (session.role === "CUSTOMER") {
    const [c] = await db
      .select({ city: customers.city, state: customers.state, addressText: customers.addressText })
      .from(customers)
      .where(eq(customers.userId, session.userId))
      .limit(1);
    if (c) customerData = { city: c.city ?? "", state: c.state ?? "", addressText: c.addressText ?? "" };
  }

  let providerData = {
    displayName: "",
    headline: "",
    bio: "",
    experienceYears: "",
    certifications: "",
    whatsapp: "",
    cep: "",
    neighborhood: "",
    serviceRadiusKm: "15",
    emergency: false,
    providerAddress: "",
    publicLocation: false,
    lat: -18.9123,
    lng: -41.9496,
  };
  if (session.role === "PROVIDER") {
    const [p] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
    if (p) {
      providerData = {
        displayName: p.displayName,
        headline: p.headline ?? "",
        bio: p.bio ?? "",
        experienceYears: p.experienceYears != null ? String(p.experienceYears) : "",
        certifications: p.certifications ?? "",
        whatsapp: p.whatsapp ?? "",
        cep: p.cep ?? "",
        neighborhood: p.neighborhood ?? "",
        serviceRadiusKm: String(p.serviceRadiusKm ?? 15),
        emergency: p.emergency,
        providerAddress: p.addressText ?? "",
        publicLocation: p.publicLocation,
        lat: p.lat ?? -18.9123,
        lng: p.lng ?? -41.9496,
      };
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:py-10">
        <Link href="/perfil" className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-[var(--primary)]">
          <ArrowLeft size={15} /> Voltar ao perfil
        </Link>
        <h1 className="font-display mt-3 text-2xl font-extrabold text-slate-900">Editar perfil</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          {session.role === "PROVIDER"
            ? "Estes dados aparecem no seu perfil público para os clientes."
            : "Mantenha seus dados atualizados para uma melhor experiência."}
        </p>

        <div className="card mb-6 p-5">
          <AvatarUpload name={me.name} initialAvatar={me.avatarUrl} />
        </div>

        <ProfileFullForm
          initial={{
            role: session.role,
            name: me.name,
            phone: me.phone ?? "",
            ...customerData,
            ...providerData,
          }}
        />
      </main>
      <Footer />
      <TabBarSpacer />
      <MobileTabBar />
    </div>
  );
}
