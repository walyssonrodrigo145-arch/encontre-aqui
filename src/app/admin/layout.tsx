import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, and, sql } from "drizzle-orm";
import { Bell, ClipboardList, CreditCard, FileBarChart, LayoutDashboard, Rocket, Star, Users } from "lucide-react";
import { db } from "@/lib/db";
import { providers, reports } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { DashShell, type DashNavItem } from "@/components/dash-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getVerifiedSession();
  if (!session) redirect("/entrar");
  if (session.role !== "ADMIN") redirect(session.role === "PROVIDER" ? "/prestador/painel" : "/app");

  const [pendingProviders, pendingReports] = await Promise.all([
    db.select({ c: sql<number>`count(*)` }).from(providers).where(eq(providers.status, "PENDING")),
    db.select({ c: sql<number>`count(*)` }).from(reports).where(and(eq(reports.status, "PENDING"))),
  ]);

  const items: DashNavItem[] = [
    { href: "/admin", label: "Resumo", icon: <LayoutDashboard size={17} /> },
    { href: "/admin/usuarios", label: "Usuários", icon: <Users size={17} /> },
    {
      href: "/admin/prestadores",
      label: "Prestadores",
      icon: <ClipboardList size={17} />,
      badge: Number(pendingProviders[0]?.c ?? 0),
    },
    { href: "/admin/categorias", label: "Categorias", icon: <Star size={17} /> },
    { href: "/admin/planos", label: "Planos", icon: <CreditCard size={17} /> },
    { href: "/admin/assinaturas", label: "Assinaturas", icon: <CreditCard size={17} /> },
    { href: "/admin/impulsionamentos", label: "Impulsionamentos", icon: <Rocket size={17} /> },
    {
      href: "/admin/avaliacoes",
      label: "Avaliações",
      icon: <Star size={17} />,
      badge: Number(pendingReports[0]?.c ?? 0),
    },
    { href: "/admin/relatorios", label: "Relatórios", icon: <FileBarChart size={17} /> },
  ];

  return (
    <DashShell
      title="Painel Administrativo"
      userName={session.name}
      userSubtitle="Super Admin"
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

