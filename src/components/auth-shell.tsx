import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarCheck, Lock, ShieldCheck, Star } from "lucide-react";
import { BrandLogo } from "./brand-logo";

const BENEFITS = [
  {
    icon: <ShieldCheck size={18} />,
    title: "Profissionais verificados",
    desc: "Documentos e perfis analisados pela nossa equipe.",
  },
  {
    icon: <CalendarCheck size={18} />,
    title: "Agendamento fácil",
    desc: "Encontre horários disponíveis e agende serviços de forma simples.",
  },
  {
    icon: <Star size={18} />,
    title: "Avaliações reais",
    desc: "Veja avaliações de pessoas que realmente contrataram o serviço.",
  },
  {
    icon: <Lock size={18} />,
    title: "Seus dados protegidos",
    desc: "Segurança e conformidade com a LGPD.",
  },
];

/**
 * Shell split-screen premium para login/cadastro:
 * - Esquerda (desktop): painel institucional escuro da marca
 * - Direita: formulário
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--sidebar)] lg:grid lg:grid-cols-2">
      {/* ─── Painel institucional (desktop) ─── */}
      <aside className="relative hidden overflow-hidden bg-[var(--sidebar)] p-12 lg:flex lg:flex-col">
        {/* glows decorativos */}
        <div className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-[#8a3ffc]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-[#2f80ed]/20 blur-3xl" />

        <div className="relative z-10">
          <Link href="/" className="inline-block transition hover:opacity-85">
            <BrandLogo variant="dark" size="lg" withTagline />
          </Link>
        </div>

        <div className="relative z-10 mt-auto mb-auto max-w-md">
          <h2 className="font-display text-3xl font-extrabold leading-tight text-white">
            Serviços profissionais
            <span className="block text-brand-gradient">perto de você.</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Encontre profissionais qualificados na sua região de forma rápida, segura e confiável.
          </p>

          <ul className="mt-8 space-y-4">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-[#a79bff] ring-1 ring-white/10">
                  {b.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{b.title}</p>
                  <p className="text-xs text-white/50">{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Depoimento */}
          <figure className="glass mt-9 rounded-2xl p-4">
            <blockquote className="text-sm leading-relaxed text-white/85">
              “Encontrei um eletricista incrível em poucos minutos pelo app. Recomendo!”
            </blockquote>
            <figcaption className="mt-3 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient font-display text-xs font-bold text-white">
                JS
              </span>
              <span>
                <span className="block text-xs font-bold text-white">Juliana S.</span>
                <span className="text-[10px] tracking-wide text-[var(--accent)]">★★★★★</span>
              </span>
            </figcaption>
          </figure>
        </div>

        <p className="relative z-10 flex items-center gap-2 text-[11px] font-medium text-white/40">
          <Lock size={12} /> Ambiente 100% seguro
          <span className="mx-1">|</span> LGPD Compliant
        </p>
      </aside>

      {/* ─── Formulário ─── */}
      <div className="flex flex-1 flex-col bg-white">
        {/* topo mobile: gradiente com logo */}
        <div className="bg-brand-gradient flex items-center justify-between px-5 py-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo variant="light" size="sm" />
          </Link>
          <Link href="/" className="text-xs font-medium text-white/80">
            Início
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
