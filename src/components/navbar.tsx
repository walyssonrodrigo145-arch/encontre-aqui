import Link from "next/link";
import { ArrowRight, Bell, LogOut } from "lucide-react";
import { getVerifiedSession } from "@/lib/auth";
import { logoutAction } from "@/server/actions/auth";
import { Avatar } from "./ui";
import { BrandLogo } from "./brand-logo";
import { HeaderScrollShell } from "./header-scroll";
import { TabBarClient, type TabItem } from "./tab-bar";
import { unreadCountAction } from "@/server/actions/notifications";

const MENU = [
  { href: "/busca", label: "Buscar serviços" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#categorias", label: "Categorias" },
  { href: "/#para-profissionais", label: "Para profissionais" },
  { href: "/prestador/assinatura", label: "Planos" },
];

export async function Navbar() {
  const session = await getVerifiedSession();
  const unread = session ? await unreadCountAction() : 0;

  return (
    <HeaderScrollShell>
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="shrink-0 transition hover:opacity-85" aria-label="Encontre Aqui — início">
          <BrandLogo variant="light" size="md" />
        </Link>

        {/* menu central */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
          {MENU.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* ações */}
        <div className="flex shrink-0 items-center gap-2.5">
          {session ? (
            <>
              <Link
                href="/notificacoes"
                className="relative rounded-xl p-2 text-slate-500 transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]"
                aria-label={`Notificações${unread > 0 ? ` (${unread} não lidas)` : ""}`}
              >
                <Bell size={20} />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <Link href="/perfil" className="flex items-center gap-2 rounded-xl p-1 pr-2 transition hover:bg-slate-100">
                <Avatar name={session.name} size={32} />
                <span className="hidden max-w-28 truncate text-sm font-medium text-slate-700 xl:inline">
                  {session.name}
                </span>
              </Link>
              <form action={logoutAction}>
                <button
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-[var(--danger)]"
                  aria-label="Sair"
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/entrar" className="btn-outline px-5">
                Entrar
              </Link>
              <Link href="/cadastro?role=PROVIDER" className="btn-gradient inline-flex items-center gap-2 px-5">
                Quero ser prestador <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>
      </div>
    </HeaderScrollShell>
  );
}

export async function MobileTabBar() {
  const session = await getVerifiedSession();

  const items: TabItem[] = !session
    ? [
        { href: "/", label: "Início", icon: "home" },
        { href: "/busca", label: "Buscar", icon: "search" },
        { href: "/entrar", label: "Entrar", icon: "user" },
        { href: "/cadastro?role=PROVIDER", label: "Prestador", icon: "wrench" },
      ]
    : session.role === "CUSTOMER"
      ? [
          { href: "/", label: "Início", icon: "home" },
          { href: "/busca", label: "Buscar", icon: "search" },
          { href: "/app/favoritos", label: "Favoritos", icon: "heart" },
          { href: "/app/solicitacoes", label: "Pedidos", icon: "clipboard" },
          { href: "/perfil", label: "Perfil", icon: "user" },
        ]
      : session.role === "PROVIDER"
        ? [
            { href: "/prestador/painel", label: "Painel", icon: "dashboard" },
            { href: "/prestador/solicitacoes", label: "Pedidos", icon: "clipboard" },
            { href: "/prestador/agenda", label: "Agenda", icon: "calendar" },
            { href: "/mensagens", label: "Chat", icon: "chat" },
            { href: "/perfil", label: "Perfil", icon: "user" },
          ]
        : [
            { href: "/admin", label: "Painel", icon: "dashboard" },
            { href: "/admin/usuarios", label: "Usuários", icon: "user" },
            { href: "/admin/prestadores", label: "Prestadores", icon: "wrench" },
            { href: "/admin/relatorios", label: "Relatórios", icon: "chart" },
            { href: "/perfil", label: "Perfil", icon: "user" },
          ];

  return <TabBarClient items={items} />;
}

export function TabBarSpacer() {
  return <div className="h-16 md:hidden" />;
}

/** Footer completo com 4 colunas */
export function Footer() {
  const year = new Date().getFullYear();

  const columns: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: "Encontre Aqui",
      links: [
        { label: "Como funciona", href: "/#como-funciona" },
        { label: "Categorias", href: "/#categorias" },
        { label: "Profissionais em destaque", href: "/#destaques" },
        { label: "Planos para prestadores", href: "/prestador/assinatura" },
      ],
    },
    {
      title: "Para clientes",
      links: [
        { label: "Buscar serviços", href: "/busca" },
        { label: "Como contratar", href: "/#como-funciona" },
        { label: "Segurança", href: "/#seguranca" },
        { label: "Perguntas frequentes", href: "/#faq" },
      ],
    },
    {
      title: "Para profissionais",
      links: [
        { label: "Seja um prestador", href: "/cadastro?role=PROVIDER" },
        { label: "Planos", href: "/prestador/assinatura" },
        { label: "Como funciona", href: "/#como-funciona" },
        { label: "Depoimentos", href: "/#depoimentos" },
      ],
    },
    {
      title: "Empresa",
      links: [
        { label: "Contato", href: "mailto:contato@encontreaqui.com.br" },
        { label: "Termos de uso", href: "/termos" },
        { label: "Política de privacidade", href: "/privacidade" },
        { label: "Perguntas frequentes", href: "/#faq" },
      ],
    },
  ];

  return (
    <footer className="border-t border-[var(--border)] bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 md:px-6 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
          {/* marca */}
          <div>
            <Link href="/" className="inline-block transition hover:opacity-85">
              <BrandLogo variant="light" withTagline />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              A forma mais prática de encontrar profissionais verificados e contratar serviços
              com segurança, perto de você.
            </p>
            <div className="mt-5 flex gap-2.5">
              <SocialLink href="https://www.instagram.com" label="Instagram">
                <InstagramSvg />
              </SocialLink>
              <SocialLink href="https://www.facebook.com" label="Facebook">
                <FacebookSvg />
              </SocialLink>
              <SocialLink href="https://wa.me/5533999990000" label="WhatsApp">
                <WhatsAppSvg />
              </SocialLink>
            </div>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-slate-500 transition-colors hover:text-[var(--primary)]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>© {year} Encontre Aqui. Todos os direitos reservados.</p>
          <p className="inline-flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <rect width="18" height="11" x="3" y="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Ambiente seguro · LGPD Compliant
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-slate-400 transition-all duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)]"
    >
      {children}
    </a>
  );
}

function InstagramSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function WhatsAppSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

