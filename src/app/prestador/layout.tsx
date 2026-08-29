import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { Bell, CalendarDays, ClipboardList, LayoutDashboard, Sparkles, Star, CreditCard, FolderOpen, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { providers, quotes } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { DashShell, type DashNavItem } from "@/components/dash-shell";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const session = await getVerifiedSession();
  if (!session) redirect("/entrar");
  if (session.role !== "PROVIDER") redirect(session.role === "ADMIN" ? "/admin" : "/app");

  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);

  if (provider && provider.status === "DRAFT") {
    redirect("/prestador/cadastro");
  }

  let openCount = 0;
  if (provider) {
    const openQuotes = await db
      .select({ id: quotes.id })
      .from(quotes)
      .where(and(eq(quotes.providerId, provider.id), eq(quotes.status, "OPEN")))
      .limit(50);
    openCount = openQuotes.length;
  }

  const items: DashNavItem[] = [
    { href: "/prestador/painel", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
    {
      href: "/prestador/solicitacoes",
      label: "Solicitações",
      icon: <ClipboardList size={17} />,
      badge: openCount,
    },
    { href: "/prestador/agenda", label: "Agenda", icon: <CalendarDays size={17} /> },
    { href: "/mensagens", label: "Mensagens", icon: <MessageCircle size={17} /> },
    { href: "/prestador/avaliacoes", label: "Avaliações", icon: <Star size={17} /> },
    { href: "/prestador/servicos", label: "Serviços", icon: <FolderOpen size={17} /> },
    { href: "/prestador/assinatura", label: "Assinatura", icon: <CreditCard size={17} /> },
    { href: "/prestador/impulsionar", label: "Impulsionamentos", icon: <Sparkles size={17} /> },
  ];

  const subtitle =
    provider?.status === "APPROVED"
      ? provider.planId
        ? "Prestador · Plano ativo"
        : "Prestador"
      : provider?.status === "PENDING"
        ? "Cadastro em análise"
        : "Prestador";

  return (
    <DashShell
      title="Dashboard"
      userName={provider?.displayName ?? session.name}
      userSubtitle={subtitle}
      items={items}
      actions={
        <Link
          href="/notificacoes"
          className="relative rounded-xl p-2 text-slate-500 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
          title="Notificações"
        >
          <Bell size={20} />
        </Link>
      }
    >
      {children}
    </DashShell>
  );
}
