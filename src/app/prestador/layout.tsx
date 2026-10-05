import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
  Star,
  CreditCard,
  FolderOpen,
  MessageCircle,
  Settings2,
  UserCog,
  UserPlus,
  Wallet,
} from "lucide-react";
import { db } from "@/lib/db";
import { providers, quotes } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { DashShell, type DashNavGroup } from "@/components/dash-shell";

function BlockedScreen({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[var(--danger)]">
          {icon}
        </span>
        <h1 className="font-display mt-4 text-xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/" className="btn-outline">Voltar ao início</Link>
          <a href="mailto:contato@encontreaqui.com.br" className="btn-ghost text-sm">
            Falar com o suporte
          </a>
        </div>
      </div>
    </div>
  );
}

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const session = await getVerifiedSession();
  if (!session) redirect("/entrar");
  if (session.role !== "PROVIDER") redirect(session.role === "ADMIN" ? "/admin" : "/app");

  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);

  if (!provider) {
    return (
      <BlockedScreen
        title="Complete seu cadastro"
        description="Seu perfil profissional ainda não foi criado. Finalize o cadastro para acessar o painel do prestador."
        icon={<UserPlus size={26} />}
      />
    );
  }
  if (provider.status === "DRAFT") {
    redirect("/prestador/cadastro");
  }
  if (provider.status === "SUSPENDED") {
    return (
      <BlockedScreen
        title="Conta suspensa"
        description="Sua conta foi suspensa pela moderação. Enquanto isso, seu perfil não aparece nas buscas e as ações do painel estão bloqueadas. Entre em contato com o suporte para resolver."
        icon={<ShieldAlert size={26} />}
      />
    );
  }
  if (provider.status === "REJECTED") {
    return (
      <BlockedScreen
        title="Cadastro não aprovado"
        description="Seu cadastro não foi aprovado pela moderação. Revise seus dados em /prestador/cadastro ou fale com o suporte."
        icon={<ShieldAlert size={26} />}
      />
    );
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

  const groups: DashNavGroup[] = [
    {
      label: "Geral",
      icon: <Settings2 size={13} />,
      items: [{ href: "/prestador/painel", label: "Dashboard", icon: <LayoutDashboard size={17} /> }],
    },
    {
      label: "Atendimento",
      icon: <Inbox size={13} />,
      items: [
        {
          href: "/prestador/solicitacoes",
          label: "Solicitações",
          icon: <ClipboardList size={17} />,
          badge: openCount,
        },
        { href: "/prestador/agenda", label: "Agenda", icon: <CalendarDays size={17} /> },
        { href: "/mensagens", label: "Mensagens", icon: <MessageCircle size={17} /> },
      ],
    },
    {
      label: "Qualidade",
      icon: <Star size={13} />,
      items: [{ href: "/prestador/avaliacoes", label: "Avaliações", icon: <Star size={17} /> }],
    },
    {
      label: "Meu negócio",
      icon: <Briefcase size={13} />,
      items: [
        { href: "/prestador/servicos", label: "Serviços", icon: <FolderOpen size={17} /> },
        { href: "/prestador/financeiro", label: "Financeiro", icon: <Wallet size={17} /> },
        { href: "/prestador/perfil", label: "Meu perfil", icon: <UserCog size={17} /> },
        { href: "/prestador/assinatura", label: "Assinatura", icon: <CreditCard size={17} /> },
        { href: "/prestador/impulsionar", label: "Impulsionamentos", icon: <Sparkles size={17} /> },
      ],
    },
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
      groups={groups}
      actions={
        <Link
          href="/notificacoes"
          className="relative rounded-xl p-2 text-slate-500 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
          title="Notificações"
        >
          <Bell size={20} />
        </Link>
      }
      footer={
        provider?.status === "APPROVED" && !provider.planId ? (
          <div className="rounded-2xl bg-gradient-to-b from-[#2b2352] to-[#191531] p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[#a5b4fc]">
              <Sparkles size={15} />
            </span>
            <p className="font-display mt-2.5 text-sm font-bold leading-snug text-white">
              Seja encontrado com mais facilidade!
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              Impulsione seu perfil e apareça para mais clientes da sua região.
            </p>
            <Link href="/prestador/impulsionar" className="btn-gradient mt-3 w-full py-2 text-xs">
              Impulsionar agora
            </Link>
          </div>
        ) : undefined
      }
    >
      {children}
    </DashShell>
  );
}
