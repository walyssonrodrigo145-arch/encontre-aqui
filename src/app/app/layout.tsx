import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/auth";
import { MobileTabBar, TabBarSpacer } from "@/components/navbar";
import { ClientTabs } from "@/components/client-tabs";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getVerifiedSession();
  if (!session) redirect("/entrar");
  if (session.role !== "CUSTOMER") redirect(session.role === "ADMIN" ? "/admin" : "/prestador/painel");

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <ClientTabs />
        <main className="mt-4 md:mt-6">{children}</main>
      </div>
      <TabBarSpacer />
      <MobileTabBar />
    </div>
  );
}
