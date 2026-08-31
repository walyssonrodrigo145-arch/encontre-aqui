import Link from "next/link";
import {
  ArrowRight,
  Award,
  BrickWall,
  Check,
  ChevronRight,
  Droplet,
  MapPin,
  PaintRoller,
  Phone,
  ShieldCheck,
  Snowflake,
  SprayCan,
  Star,
  Zap,
} from "lucide-react";
import { FadeIn, FadeSlide } from "@/components/motion";
import { Avatar } from "@/components/ui";
import { initials } from "@/lib/utils";
import { HeroSearch } from "./hero-search";
import type { RankedProvider } from "@/server/services/search";

interface HeroProps {
  isProvider: boolean;
  firstName: string | null;
  featured: RankedProvider[];
}

const MINI_FEATURES = [
  { icon: ShieldCheck, title: "Profissionais verificados", sub: "Segurança e confiança" },
  { icon: Star, title: "Avaliações reais", sub: "Decida com confiança" },
  { icon: Zap, title: "Orçamentos rápidos", sub: "Compare e escolha" },
] as const;

const TOP_SEARCHES: { label: string; icon: React.ReactNode }[] = [
  { label: "Eletricista", icon: <Zap size={15} /> },
  { label: "Encanador", icon: <Droplet size={15} /> },
  { label: "Pintor", icon: <PaintRoller size={15} /> },
  { label: "Pedreiro", icon: <BrickWall size={15} /> },
  { label: "Diarista", icon: <SprayCan size={15} /> },
  { label: "Ar-condicionado", icon: <Snowflake size={15} /> },
];

export function HeroSection({ isProvider, firstName, featured }: HeroProps) {
  const main = featured[0];

  // Tags 100% derivadas de dados reais do prestador
  const heroTags: { key: string; label: string; icon: React.ReactNode; amber?: boolean }[] = [];
  if (main) {
    if (main.availableToday)
      heroTags.push({
        key: "disp",
        label: "Disponível hoje",
        icon: <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />,
      });
    if (main.ratingCount >= 10)
      heroTags.push({
        key: "aval",
        label: "Bem avaliado",
        icon: <Star size={11} className="fill-[var(--accent)] text-[var(--accent)]" />,
      });
    if (main.completedJobs >= 20)
      heroTags.push({ key: "exp", label: "Experiente", icon: <Award size={11} /> });
    if (main.emergency)
      heroTags.push({
        key: "emerg",
        label: "Atende emergências",
        icon: <Zap size={11} />,
        amber: true,
      });
  }

  return (
    <section className="relative overflow-hidden">
      {/* fundo claro com blobs sutis */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[var(--primary)]/[0.07] blur-3xl" />
        <div className="absolute right-0 top-20 h-[28rem] w-[28rem] rounded-full bg-[#2f80ed]/[0.06] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#8a3ffc]/[0.05] blur-3xl" />
      </div>

      {/* topbar mobile */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-5 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient">
            <PinWhite />
          </span>
          <span className="font-display text-base font-extrabold text-slate-900">
            encontre <span className="text-brand-gradient">aqui</span>
          </span>
        </Link>
        <Link
          href="/entrar"
          className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
        >
          Entrar
        </Link>
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-14 pt-10 md:px-6 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20">
        {/* ─── Conteúdo ─── */}
        <div className="min-w-0">
          {isProvider ? (
            <>
              <FadeIn>
                <span className="badge bg-[var(--primary-soft)] px-3.5 py-1.5 font-medium text-[var(--primary-dark)]">
                  Painel do prestador
                </span>
              </FadeIn>
              <FadeIn delay={0.05}>
                <h1 className="font-display mt-4 text-3xl font-extrabold leading-[1.15] text-slate-900 md:text-4xl xl:text-[2.75rem]">
                  {firstName ? `Olá, ${firstName}!` : "Bem-vindo,"}{" "}
                  <span className="text-brand-gradient">cresça com a gente.</span>
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                  Acompanhe solicitações, gerencie sua agenda e impulsione seu perfil para
                  receber mais clientes.
                </p>
              </FadeIn>
              <FadeIn delay={0.08}>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/prestador/painel" className="btn-gradient px-6 py-3.5 text-[15px]">
                    Abrir meu painel
                  </Link>
                  <Link href="/prestador/impulsionar" className="btn-outline px-6 py-3.5 text-[15px]">
                    Impulsionar perfil
                  </Link>
                </div>
              </FadeIn>
            </>
          ) : (
            <>
              <FadeIn>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/15 bg-[var(--primary-soft)] px-4 py-1.5 text-[13px] font-semibold text-[var(--primary-dark)]">
                  <ShieldCheck size={15} />
                  Profissionais verificados perto de você
                </span>
              </FadeIn>
              <FadeIn delay={0.05}>
                <h1 className="font-display mt-5 text-3xl font-extrabold leading-[1.15] text-slate-900 md:text-4xl xl:text-[2.9rem]">
                  Encontre <span className="text-brand-gradient">quem resolve</span> o que
                  você precisa.
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                  Conectamos você aos melhores profissionais da sua região. Compare avaliações,
                  solicite orçamentos e resolva tudo de forma rápida, segura e sem complicações.
                </p>
              </FadeIn>
              <HeroSearch />

              <FadeIn delay={0.15}>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {MINI_FEATURES.map(({ icon: Icon, title, sub }) => (
                    <div
                      key={title}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-3.5 shadow-sm"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                        <Icon size={19} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-bold text-slate-800">{title}</span>
                        <span className="block truncate text-[11px] text-slate-400">{sub}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">Categorias populares</p>
                  <Link
                    href="/busca"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] hover:underline"
                  >
                    Ver todas as categorias <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {TOP_SEARCHES.map(({ label, icon }) => (
                    <Link
                      key={label}
                      href={`/busca?q=${encodeURIComponent(label)}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--primary)] hover:text-[var(--primary)] hover:shadow-md hover:shadow-[var(--primary)]/10"
                    >
                      <span className="text-[var(--primary)]">{icon}</span>
                      {label}
                    </Link>
                  ))}
                </div>
              </FadeIn>
            </>
          )}
        </div>

        {/* ─── Composição: cards de profissionais reais ─── */}
        {!isProvider && main && (
          <FadeSlide delay={0.2} className="relative hidden min-h-[480px] lg:block">
            {/* card principal */}
            <div className="card absolute left-14 right-0 top-2 z-10 p-6 shadow-2xl shadow-[var(--primary)]/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-base font-bold text-white shadow-[0_6px_16px_rgba(109,74,255,0.35)]">
                  {initials(main.displayName)}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                      <Check size={10} strokeWidth={3.2} className="text-white" />
                    </span>
                    Orçamento sem compromisso
                  </span>
                  {main.verificationLevel !== "NONE" && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                      <Phone size={11} className="text-[var(--info)]" /> Telefone verificado
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-display mt-4 text-xl font-bold text-slate-900">{main.displayName}</h3>
              <p className="text-sm text-slate-500">{main.headline ?? "Profissional"}</p>

              <div className="mt-2.5 flex items-center gap-1.5 text-sm">
                <Star size={16} className="fill-[var(--accent)] text-[var(--accent)]" />
                <b className="text-slate-800">{main.ratingAvg.toFixed(1).replace(".", ",")}</b>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{main.ratingCount} avaliações</span>
              </div>
              <p className="mt-1.5 inline-flex items-center gap-1 text-sm text-slate-500">
                <MapPin size={13} className="text-slate-400" /> {main.city} – {main.state}
              </p>

              {heroTags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {heroTags.map((t) =>
                    t.key === "disp" ? (
                      <span key={t.key} className="badge-success">
                        {t.icon}
                        {t.label}
                      </span>
                    ) : (
                      <span
                        key={t.key}
                        className={
                          t.amber
                            ? "inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
                            : "inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary-dark)]"
                        }
                      >
                        {t.icon}
                        {t.label}
                      </span>
                    ),
                  )}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-[13px] font-medium text-slate-400">Verificar disponibilidade</span>
                <Link
                  href={`/p/${main.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-bold text-[var(--primary)] hover:underline"
                >
                  Ver perfil <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* card secundário */}
            {featured[1] && (
              <div className="card absolute -bottom-2 right-0 z-20 w-64 p-4 shadow-xl shadow-[var(--primary)]/10">
                <div className="flex items-center gap-3">
                  <Avatar name={featured[1].displayName} size={42} className="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{featured[1].displayName}</p>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Star size={12} className="fill-[var(--accent)] text-[var(--accent)]" />
                      <b className="text-slate-700">{featured[1].ratingAvg.toFixed(1).replace(".", ",")}</b>
                      <span className="text-slate-400">· {featured[1].ratingCount} avaliações</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-300" />
                </div>
              </div>
            )}
          </FadeSlide>
        )}
      </div>
    </section>
  );
}

function PinWhite() {
  return (
    <svg width="16" height="19" viewBox="0 0 48 56" fill="none" aria-hidden>
      <path
        d="M24 2C13.6 2 5.2 10.4 5.2 20.8c0 6.9 4.3 13.1 9.3 18.9 3.1 3.6 6.4 7 9.5 10.3 3.1-3.3 6.4-6.7 9.5-10.3 5-5.8 9.3-12 9.3-18.9C42.8 10.4 34.4 2 24 2z"
        fill="#fff"
      />
    </svg>
  );
}
