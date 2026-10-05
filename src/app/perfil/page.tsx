import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CreditCard,
  FileText,
  Heart,
  LogOut,
  Pencil,
  Shield,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providers, subscriptionPlans, users } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { logoutAction } from "@/server/actions/auth";
import { Navbar, Footer, MobileTabBar, TabBarSpacer } from "@/components/navbar";
import { Avatar } from "@/components/ui";
import { FadeIn } from "@/components/motion";

export const metadata = { title: "Meu perfil" };
export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await getVerifiedSession();
  if (!session) redirect("/entrar");

  const [me] = await db
    .select({ phone: users.phone, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  const plan =
    session.role === "PROVIDER"
      ? (
          await db
            .select({ name: subscriptionPlans.name })
            .from(providers)
            .leftJoin(subscriptionPlans, eq(providers.planId, subscriptionPlans.id))
            .where(eq(providers.userId, session.userId))
            .limit(1)
        )[0]?.name
      : null;

  const links =
    session.role === "CUSTOMER"
      ? [
          { href: "/app", label: "Meu painel", icon: <User size={17} /> },
          { href: "/app/solicitacoes", label: "Minhas solicitações", icon: <FileText size={17} /> },
          { href: "/app/agendamentos", label: "Agendamentos", icon: <Sparkles size={17} /> },
          { href: "/app/favoritos", label: "Favoritos", icon: <Heart size={17} /> },
          { href: "/mensagens", label: "Mensagens", icon: <ArrowRight size={17} /> },
        ]
        : session.role === "PROVIDER"
          ? [
              { href: "/prestador/painel", label: "Dashboard", icon: <User size={17} /> },
              { href: "/prestador/financeiro", label: "Financeiro", icon: <Wallet size={17} /> },
              { href: "/prestador/assinatura", label: `Assinatura${plan ? ` · ${plan}` : ""}`, icon: <CreditCard size={17} /> },
              { href: "/prestador/impulsionar", label: "Impulsionar perfil", icon: <Sparkles size={17} /> },
              { href: "/prestador/servicos", label: "Meus serviços", icon: <ArrowRight size={17} /> },
              { href: "/mensagens", label: "Mensagens", icon: <ArrowRight size={17} /> },
            ]
        : [
            { href: "/admin", label: "Painel administrativo", icon: <Shield size={17} /> },
            { href: "/admin/relatorios", label: "Relatórios", icon: <FileText size={17} /> },
          ];

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-brand-gradient px-4 pb-10 pt-8 md:hidden">
        <div className="flex items-center gap-3">
          <Avatar name={session.name} src={me?.avatarUrl} size={56} className="ring-4 ring-white/30" />
          <div className="min-w-0">
            <p className="font-display truncate text-lg font-bold text-white">{session.name}</p>
            <p className="text-xs text-white/70">
              {session.role === "CUSTOMER" ? "Cliente" : session.role === "PROVIDER" ? `Prestador${plan ? ` · ${plan}` : ""}` : "Administrador"}
            </p>
          </div>
        </div>
      </div>

      <Navbar />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 md:py-10">
        <div className="card -mt-6 p-5 md:mt-0">
          <FadeIn>
            <div className="hidden items-center gap-4 md:flex">
              <Avatar name={session.name} src={me?.avatarUrl} size={64} />
              <div>
                <h1 className="font-display text-xl font-extrabold text-slate-900">{session.name}</h1>
                <p className="text-sm text-slate-500">
                  {session.role === "CUSTOMER" ? "Cliente" : session.role === "PROVIDER" ? `Prestador${plan ? ` · Plano ${plan}` : ""}` : "Administrador"}
                </p>
              </div>
              <Link href="/perfil/editar" className="btn-outline ml-auto px-4 py-2 text-xs">
                <Pencil size={13} /> Editar perfil
              </Link>
            </div>

            <nav className="mt-4 space-y-1.5 md:mt-6">
              <Link
                href="/perfil/editar"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
              >
                <span className="text-slate-400"><Pencil size={17} /></span>
                Editar perfil completo
                <ArrowRight size={15} className="ml-auto text-slate-300" />
              </Link>
              {links.map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                >
                  <span className="text-slate-400">{l.icon}</span>
                  {l.label}
                  <ArrowRight size={15} className="ml-auto text-slate-300" />
                </Link>
              ))}
              <Link
                href="/notificacoes"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
              >
                <span className="text-slate-400"><Bell size={17} /></span>
                Notificações
                <ArrowRight size={15} className="ml-auto text-slate-300" />
              </Link>
              <Link
                href="/privacidade"
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
              >
                <span className="text-slate-400"><Shield size={17} /></span>
                Privacidade e termos (LGPD)
                <ArrowRight size={15} className="ml-auto text-slate-300" />
              </Link>
            </nav>

            <form action={logoutAction} className="mt-4 border-t border-slate-100 pt-4">
              <button className="btn w-full text-[var(--danger)] hover:bg-red-50">
                <LogOut size={16} /> Sair da conta
              </button>
            </form>
          </FadeIn>
        </div>
      </main>

      <Footer />
      <TabBarSpacer />
      <MobileTabBar />
    </div>
  );
}
