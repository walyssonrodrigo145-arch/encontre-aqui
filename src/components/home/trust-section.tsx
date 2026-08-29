import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, Lock, MapPin, Quote, ShieldCheck, Star, Users } from "lucide-react";
import { FadeIn } from "@/components/motion";

const CHECKS = [
  "Perfis verificados pela nossa equipe",
  "Avaliações de clientes reais",
  "Informações transparentes de serviços e preços",
  "Comunicação segura dentro da plataforma",
  "Mais facilidade para comparar profissionais",
];

const STATS = [
  { icon: ShieldCheck, iconClass: "text-[#8b7cf6]", value: "+12 mil", label: "Profissionais verificados" },
  { icon: Users, iconClass: "text-[#a78bfa]", value: "+250 mil", label: "Contratações realizadas" },
  { icon: Star, iconClass: "fill-[#34d399] text-[#34d399]", value: "4,8/5", label: "Avaliação média" },
  { icon: Lock, iconClass: "text-[#8b7cf6]", value: "100%", label: "Ambiente seguro" },
] as const;

export function TrustSection() {
  return (
    <section id="seguranca" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-12 md:px-6 md:py-16">
      <FadeIn>
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[#070b18] p-6 sm:p-10 lg:p-14">
          {/* glows de fundo */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#8a3ffc]/25 blur-[100px]" aria-hidden />
          <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[#2f80ed]/15 blur-[110px]" aria-hidden />
          <div className="pointer-events-none absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-[#6d4aff]/10 blur-[90px]" aria-hidden />

          <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            {/* ── Coluna esquerda ── */}
            <div>
              <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-2 pr-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-gradient text-white">
                  <ShieldCheck size={14} />
                </span>
                <span className="flex items-center gap-2 text-xs font-medium text-white/80">
                  Profissionais verificados
                  <span className="h-1 w-1 rounded-full bg-white/30" aria-hidden />
                  Plataforma segura
                </span>
              </span>

              <h2 className="font-display mt-6 text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl">
                Contrate com
                <br />
                mais <span className="text-brand-gradient">confiança.</span>
              </h2>

              <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60 md:text-base">
                Cada detalhe da plataforma foi pensado para você contratar com tranquilidade —
                do primeiro orçamento até a avaliação final.
              </p>

              <ul className="mt-8 space-y-4">
                {CHECKS.map((c) => (
                  <li key={c} className="flex items-center gap-3 text-[15px] text-white/85">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gradient shadow-[0_0_12px_rgba(109,74,255,0.5)]">
                      <Check size={13} strokeWidth={3} className="text-white" />
                    </span>
                    {c}
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-wrap items-center gap-5">
                <Link
                  href="/busca"
                  className="btn-gradient inline-flex items-center gap-3 rounded-xl px-6 py-3 text-[15px] font-bold"
                >
                  Encontrar profissional
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--primary)]">
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </span>
                </Link>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[#8b7cf6]">
                    <ShieldCheck size={16} />
                  </span>
                  <p className="text-xs leading-snug text-white/50">
                    Seus dados protegidos
                    <br />
                    e 100% seguros
                  </p>
                </div>
              </div>
            </div>

            {/* ── Coluna direita: composição de confiança ── */}
            <div className="relative space-y-4">
              {/* cartão: profissional */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient text-lg font-bold text-white shadow-[0_0_24px_rgba(109,74,255,0.45)]">
                      JE
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#070b18]">
                      <BadgeCheck size={20} className="fill-[var(--info)] text-white" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-base font-bold text-white">João Eletricista</p>
                      <BadgeCheck size={16} className="shrink-0 fill-[var(--info)] text-white" />
                    </div>
                    <p className="text-sm text-white/50">Eletricista residencial</p>
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <Star size={15} className="fill-[var(--accent)] text-[var(--accent)]" />
                        <span className="font-bold text-white">4,9</span>
                        <span className="text-white/40">(127 avaliações)</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm text-white/50">
                        <MapPin size={14} /> 2,4 km
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* cartão: perfil verificado */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                <span className="absolute inset-y-0 left-0 w-1 bg-brand-gradient" aria-hidden />
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-[0_0_18px_rgba(109,74,255,0.4)]">
                    <ShieldCheck size={22} />
                  </span>
                  <div>
                    <p className="text-base font-bold text-white">Perfil verificado</p>
                    <p className="text-sm text-white/50">Documentos analisados pela nossa equipe</p>
                  </div>
                </div>
              </div>

              {/* cartão: depoimento */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                <Quote className="pointer-events-none absolute -right-2 top-1/2 h-24 w-24 -translate-y-1/2 text-white/[0.05]" aria-hidden />
                <div className="relative">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={16} className="fill-[var(--accent)] text-[var(--accent)]" />
                    ))}
                  </div>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-white/75">
                    “Serviço excelente, profissionais pontuais e confiáveis. Recomendo!”
                  </p>
                  <p className="mt-2 text-sm font-medium text-[#5ea3ff]">— Cliente verificado</p>
                </div>
              </div>

              {/* barra de estatísticas */}
              <div className="grid grid-cols-2 gap-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-4 sm:gap-y-0 sm:divide-x sm:divide-white/10">
                {STATS.map(({ icon: Icon, iconClass, value, label }) => (
                  <div key={label} className="flex flex-col items-start gap-1.5 px-3 first:pl-1">
                    <Icon size={20} className={iconClass} />
                    <p className="font-display text-lg font-extrabold leading-none text-white">{value}</p>
                    <p className="text-[11px] leading-snug text-white/45">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
