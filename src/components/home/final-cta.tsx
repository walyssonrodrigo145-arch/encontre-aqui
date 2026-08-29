import Link from "next/link";
import { ArrowRight, ChevronRight, Clock, Lock, Search, ShieldCheck, Star, User, Zap } from "lucide-react";
import { FadeIn } from "@/components/motion";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Profissionais verificados",
    sub: "Mais segurança para você e para seu projeto.",
  },
  {
    icon: Star,
    title: "Avaliações reais",
    sub: "Veja opiniões de clientes e faça a escolha certa.",
  },
  {
    icon: Clock,
    title: "Resposta rápida",
    sub: "Receba orçamentos e respostas em pouco tempo.",
  },
  {
    icon: Lock,
    title: "Seus dados protegidos",
    sub: "Suas informações sempre seguem protegidas.",
  },
] as const;

export function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 md:px-6 md:pb-24">
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl bg-[#0a0d22] px-6 py-14 text-center md:py-16">
          {/* decorações de fundo */}
          <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#7c3aed]/40 blur-[110px]" aria-hidden />
          <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-[#1d4ed8]/25 blur-[110px]" aria-hidden />
          <div className="pointer-events-none absolute -right-40 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full border border-white/[0.07]" aria-hidden />
          <div className="pointer-events-none absolute -right-16 top-1/2 h-[260px] w-[260px] -translate-y-1/2 rounded-full border border-white/[0.05]" aria-hidden />
          <div
            className="pointer-events-none absolute left-8 top-1/2 hidden h-44 w-28 -translate-y-1/2 opacity-60 md:block"
            aria-hidden
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.16) 1.5px, transparent 1.5px)",
              backgroundSize: "16px 16px",
            }}
          />

          <div className="relative mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white/85 backdrop-blur">
              <ShieldCheck size={15} className="text-[#8b7cf6]" />
              Profissionais verificados
            </span>

            <h2 className="font-display mt-7 text-4xl font-extrabold leading-[1.12] text-white sm:text-5xl">
              Pronto para encontrar o
              <br className="hidden sm:block" />{" "}
              <span className="bg-gradient-to-r from-[#8a3ffc] via-[#6d4aff] to-[#3b82f6] bg-clip-text text-transparent">
                profissional
              </span>{" "}
              certo?
            </h2>

            <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/60 md:text-base">
              Pesquise, compare e encontre quem pode{" "}
              <span className="bg-gradient-to-r from-[#8a3ffc] to-[#3b82f6] bg-clip-text font-semibold text-transparent">
                resolver
              </span>{" "}
              o que você precisa.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <Link
                href="/busca"
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_30px_rgba(109,74,255,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(109,74,255,0.55)] sm:w-auto"
              >
                <Search size={18} />
                Encontrar um profissional
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/cadastro?role=PROVIDER"
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/[0.04] px-7 py-3.5 text-[15px] font-bold text-white backdrop-blur transition hover:bg-white/10 sm:w-auto"
              >
                <User size={18} />
                Quero ser prestador
                <ArrowRight size={18} />
              </Link>
            </div>

            <Link
              href="/busca?emergencia=1"
              className="mt-7 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] py-2.5 pl-2.5 pr-4 text-sm text-white/80 backdrop-blur transition hover:bg-white/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7c3aed]">
                <Zap size={13} className="fill-white text-white" />
              </span>
              Precisa resolver isso hoje? Veja profissionais{" "}
              <span className="font-bold text-[#5ea3ff]">disponíveis agora</span>
              <ChevronRight size={16} className="text-white/50" />
            </Link>
          </div>

          {/* selos de confiança */}
          <div className="relative mx-auto mt-12 grid max-w-5xl gap-8 border-t border-white/[0.06] pt-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-white/[0.06]">
            {FEATURES.map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-start gap-3.5 px-2 text-left lg:px-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#151a35] text-[#8b7cf6] shadow-[0_0_18px_rgba(124,58,237,0.35)]">
                  <Icon size={19} />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="mt-1 text-[13px] leading-snug text-white/50">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
