import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Heart, LayoutDashboard, MessageCircle, ClipboardList } from "lucide-react";
import { getVerifiedSession } from "@/lib/auth";
import { MobileTabBar, TabBarSpacer } from "@/components/navbar";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await getVerifiedSession();
  if (!session) redirect("/entrar");
  if (session.role !== "CUSTOMER") redirect(session.role === "ADMIN" ? "/admin" : "/prestador/painel");

  return (
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <div className="hidden gap-2 md:flex">
          <ClientTab href="/app" icon={<LayoutDashboard size={15} />} label="Início" />
          <ClientTab href="/app/solicitacoes" icon={<ClipboardList size={15} />} label="Solicitações" />
          <ClientTab href="/app/agendamentos" icon={<CalendarDays size={15} />} label="Agendamentos" />
          <ClientTab href="/mensagens" icon={<MessageCircle size={15} />} label="Mensagens" />
          <ClientTab href="/app/favoritos" icon={<Heart size={15} />} label="Favoritos" />
        </div>
        <main className="mt-4 md:mt-6">{children}</main>
      </div>
      <TabBarSpacer />
      <MobileTabBar />
    </div>
  );
}

function ClientTab({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="btn-ghost text-sm">
      {icon} {label}
    </Link>
  );
}
