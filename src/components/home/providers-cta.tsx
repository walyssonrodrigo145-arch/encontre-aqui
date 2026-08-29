import Link from "next/link";
import {
  BadgeCheck,
  ChartLine,
  Check,
  ChevronRight,
  Crosshair,
  Headset,
  Lock,
  MapPin,
  Medal,
  Rocket,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { FadeIn } from "@/components/motion";

const BENEFITS = [
  "Crie seu perfil profissional",
  "Mostre seus serviços e portfólio",
  "Receba oportunidades da sua região",
  "Conquiste avaliações de clientes",
  "Aumente sua presença na sua região",
];

/* Avatar ilustrado (rosto) — autocontido, sem depender de imagens externas */
function MiniFace({
  bg,
  hair,
  skin,
  shirt,
  beard = false,
  long = false,
  className,
}: {
  bg: string;
  hair: string;
  skin: string;
  shirt: string;
  beard?: boolean;
  long?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-block overflow-hidden rounded-full ${className ?? ""}`} aria-hidden>
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <circle cx="32" cy="32" r="32" fill={bg} />
        {long && <ellipse cx="32" cy="31" rx="14.5" ry="16" fill={hair} />}
        <path d="M32 41.5c-10.5 0-16.5 6.2-17.5 14.3a32 32 0 0 0 35 0C48.5 47.7 42.5 41.5 32 41.5z" fill={shirt} />
        <rect x="27" y="33.5" width="10" height="9.5" rx="4.75" fill={skin} />
        <ellipse cx="32" cy="26" rx="10.5" ry="11.5" fill={skin} />
        {long ? (
          <path
            d="M21.8 27.5C21.8 19 26 13.5 32 13.5S42.2 19 42.2 27.5c0 .8 0 1.5-.2 2.2-.9-4.4-2.4-6.2-4.6-6.2-1.7 1.2-3.4 1.7-5.4 1.7s-3.7-.5-5.4-1.7c-2.2 0-3.7 1.8-4.6 6.2-.2-.7-.2-1.4-.2-2.2z"
            fill={hair}
          />
        ) : (
          <path
            d="M21.5 26c0-7.5 4.7-12.5 10.5-12.5S42.5 18.5 42.5 26c0 .9-.1 1.7-.3 2.4-1.1-5.8-4.3-8.4-10.2-8.4s-9.1 2.6-10.2 8.4c-.2-.7-.3-1.5-.3-2.4z"
            fill={hair}
          />
        )}
        {beard && (
          <path
            d="M22.6 28.5c.9 8.3 4.4 12.5 9.4 12.5s8.5-4.2 9.4-12.5c-1.6 4.9-4.7 7.4-9.4 7.4s-7.8-2.5-9.4-7.4z"
            fill={hair}
          />
        )}
        <circle cx="27.8" cy="27" r="1.3" fill="#332e2a" />
        <circle cx="36.2" cy="27" r="1.3" fill="#332e2a" />
        <path
          d="M25.6 24.3c1.3-.8 3.1-.9 4.4-.2M34 24.1c1.3-.7 3.1-.6 4.4.2"
          stroke={hair}
          strokeWidth="1.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M28.6 31.6c2.1 1.6 4.7 1.6 6.8 0"
          stroke={beard ? "#a86a3f" : "#c9805a"}
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}

function PhoneMockup() {
  return (
    <div className="relative rotate-[7deg] rounded-[2.9rem] bg-gradient-to-b from-slate-400/50 via-slate-600/40 to-slate-400/50 p-[3px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.65)]">
      <div className="rounded-[2.75rem] bg-[#05070f] p-2">
        <div className="overflow-hidden rounded-[2.35rem] bg-[#0d1226] px-4 pb-5 pt-3">
          <span className="mx-auto block h-5 w-20 rounded-full bg-black/70" aria-hidden />
          <div className="relative mx-auto mt-4 w-[74px]">
            <MiniFace
              bg="#dbeafe"
              hair="#4a3222"
              skin="#efb68f"
              shirt="#2f80ed"
              beard
              className="h-[74px] w-[74px]"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#0d1226]">
              <BadgeCheck size={24} className="fill-[var(--info)] text-white" />
            </span>
          </div>
          <p className="mt-3 text-center text-[15px] font-bold text-white">João Eletricista</p>
          <p className="text-center text-xs text-white/45">Eletricista residencial</p>
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs">
            <Star size={13} className="fill-[var(--accent)] text-[var(--accent)]" />
            <span className="font-bold text-white">4,9</span>
            <span className="text-white/40">(127 avaliações)</span>
          </div>
          <div className="mt-1 flex items-center justify-center gap-1 text-xs text-white/60">
            <MapPin size={12} className="text-[#5ea3ff]" /> 2,4 km de você
          </div>
          <div className="mt-4 rounded-xl bg-brand-gradient py-2.5 text-center text-[13px] font-bold text-white">
            Ver perfil completo
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProvidersCta() {
  return (
    <section id="para-profissionais" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-12 md:px-6 md:py-16">
      <FadeIn>
        <div className="card relative grid overflow-hidden lg:grid-cols-2">
          {/* ── Painel esquerdo ── */}
          <div className="relative overflow-hidden bg-[#0a0d22] p-7 text-white sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#7c3aed]/35 blur-[100px]" aria-hidden />
            <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#4f46e5]/25 blur-[100px]" aria-hidden />
            <div
              className="absolute inset-0 opacity-30"
              aria-hidden
              style={{
                backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />

            <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_248px] lg:gap-5">
              <div className="relative">
                <h2 className="font-display text-4xl font-extrabold leading-[1.08] sm:text-5xl">
                  Você presta
                  <br />
                  <span className="bg-gradient-to-r from-[#8a3ffc] via-[#6d4aff] to-[#3b82f6] bg-clip-text text-transparent">
                    serviços?
                  </span>
                </h2>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/65">
                  Encontre novos clientes e aumente suas oportunidades através do{" "}
                  <span className="font-semibold text-[#5ea3ff]">Encontre Aqui.</span>
                </p>
                <ul className="mt-7 space-y-3.5">
                  {BENEFITS.map((b) => (
                    <li key={b} className="flex items-center gap-3 text-[15px] text-white/85">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-gradient shadow-[0_0_12px_rgba(139,92,246,0.55)]">
                        <Check size={13} strokeWidth={3} className="text-white" />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>

                <div className="mt-9 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
                      <Users size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">Profissionais verificados</p>
                      <p className="text-xs text-white/50">Mais confiança para clientes e prestadores.</p>
                    </div>
                  </div>
                  <ShieldCheck size={26} className="shrink-0 text-white/20" />
                </div>
              </div>

              {/* ── Mockup do celular ── */}
              <div className="relative mx-auto w-[248px] lg:mr-[-12px]">
                <PhoneMockup />

                <div className="absolute -left-16 bottom-16 z-10 hidden w-[218px] animate-float rounded-2xl border border-white/10 bg-[#141936]/95 p-3.5 shadow-2xl backdrop-blur sm:flex sm:items-center sm:gap-3 lg:-left-20">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8a3ffc] to-[#2f80ed] text-white">
                    <ChartLine size={18} />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-white">Mais oportunidades</p>
                    <p className="text-[11px] leading-snug text-white/55">
                      Seja encontrado por quem precisa dos seus serviços.
                    </p>
                  </div>
                </div>

                <div className="absolute -bottom-5 -right-2 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#8a3ffc] to-[#2f80ed] shadow-[0_0_28px_rgba(109,74,255,0.65)] ring-4 ring-[#8a3ffc]/20">
                  <Crosshair size={22} className="text-white" />
                </div>

                <svg
                  className="pointer-events-none absolute -right-7 bottom-1 h-16 w-16 text-white/30"
                  viewBox="0 0 64 64"
                  fill="none"
                  aria-hidden
                >
                  <path d="M4 60 C 24 54, 50 38, 58 6" stroke="currentColor" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── Painel direito ── */}
          <div className="relative flex flex-col justify-center bg-white p-7 sm:p-10 lg:p-12">
            <div
              className="pointer-events-none absolute right-6 top-6 h-24 w-36 opacity-70"
              aria-hidden
              style={{
                backgroundImage: "radial-gradient(rgba(109,74,255,0.22) 1.5px, transparent 1.5px)",
                backgroundSize: "14px 14px",
              }}
            />

            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
              <Medal size={13} /> Planos
            </span>

            <p className="font-display mt-6 text-2xl font-bold text-slate-900">Planos a partir de</p>
            <div className="mt-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display bg-gradient-to-r from-[#7c3aed] to-[#2f80ed] bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl">
                  R$ 29,90
                </span>
                <span className="text-xl font-bold text-[#2f80ed]">/mês</span>
              </p>
              <span className="mt-2 block h-1.5 w-44 rounded-full bg-gradient-to-r from-[#8a3ffc]/70 to-[#2f80ed]/40" aria-hidden />
            </div>

            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-600">
              Cancele quando quiser. Seu perfil fica visível para clientes da sua região, com agenda,
              orçamentos e avaliações organizados em um só lugar.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/cadastro?role=PROVIDER" className="btn-gradient inline-flex items-center gap-2 px-6 py-3 text-[15px]">
                <Rocket size={17} /> Quero ser prestador
              </Link>
              <Link href="/prestador/assinatura" className="btn-outline inline-flex items-center gap-1.5 px-6 py-3 text-[15px]">
                Ver planos <ChevronRight size={16} />
              </Link>
            </div>

            <div className="mt-9 grid grid-cols-3 divide-x divide-[var(--border)]">
              <div className="flex flex-col items-center gap-2 px-2 text-center">
                <ShieldCheck size={20} className="text-slate-700" />
                <p className="text-xs leading-snug text-slate-500">Sem fidelidade</p>
              </div>
              <div className="flex flex-col items-center gap-2 px-2 text-center">
                <Headset size={20} className="text-slate-700" />
                <p className="text-xs leading-snug text-slate-500">Suporte durante todo o processo</p>
              </div>
              <div className="flex flex-col items-center gap-2 px-2 text-center">
                <Lock size={20} className="text-slate-700" />
                <p className="text-xs leading-snug text-slate-500">
                  Seus dados <span className="font-semibold text-slate-700">protegidos</span>
                </p>
              </div>
            </div>

            <div className="mt-7 flex items-center gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--primary-soft)]/50 p-3.5">
              <div className="flex shrink-0 -space-x-2.5">
                <MiniFace bg="#ffe4e6" hair="#6b3a2a" skin="#f3c29e" shirt="#8a3ffc" long className="h-9 w-9 ring-2 ring-white" />
                <MiniFace bg="#d1fae5" hair="#1f2937" skin="#c68863" shirt="#10b981" className="h-9 w-9 ring-2 ring-white" />
                <MiniFace bg="#fef3c7" hair="#b45309" skin="#f3c29e" shirt="#2f80ed" long className="h-9 w-9 ring-2 ring-white" />
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-bold text-white ring-2 ring-white">
                  +5k
                </span>
              </div>
              <p className="text-[13px] leading-snug text-slate-500">
                <span className="font-bold text-slate-800">Mais de 5.000 profissionais</span>
                <br />
                já estão crescendo com a gente
              </p>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
