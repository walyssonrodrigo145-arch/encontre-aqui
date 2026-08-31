import { CheckCircle2, Handshake, Search, Users } from "lucide-react";
import { FadeIn } from "@/components/motion";

interface Step {
  num: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    num: "01",
    title: "Busque",
    desc: "Informe o serviço e sua localização.",
    icon: <Search size={22} />,
  },
  {
    num: "02",
    title: "Compare",
    desc: "Veja perfis, avaliações e informações.",
    icon: <Users size={22} />,
  },
  {
    num: "03",
    title: "Escolha",
    desc: "Escolha o profissional ideal para você.",
    icon: <CheckCircle2 size={22} />,
  },
  {
    num: "04",
    title: "Contrate",
    desc: "Combine os detalhes e realize o serviço.",
    icon: <Handshake size={22} />,
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-12 md:px-6 md:py-16">
      <FadeIn>
        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-slate-900 md:text-2xl">
            Do problema à solução em poucos passos
          </h2>
          <p className="mt-1 text-[15px] text-slate-500">
            Encontrar o profissional certo ficou simples.
          </p>
        </div>
      </FadeIn>

      {/* Desktop: timeline horizontal com linha de conexão */}
      <FadeIn delay={0.05} className="mt-10 hidden lg:block">
        <div className="relative">
          {/* linha conectando */}
          <div className="absolute left-[12%] right-[12%] top-7 border-t-2 border-dashed border-slate-200" aria-hidden />
          <div className="relative grid grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.num} className="flex flex-col items-center text-center">
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-white shadow-[0_4px_16px_rgba(20,18,31,0.06)]">
                  <span className="text-[var(--primary)]">{step.icon}</span>
                  <span className="font-display absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-bold text-white">
                    {step.num}
                  </span>
                </div>
                <h3 className="font-display mt-4 text-base font-bold uppercase tracking-wide text-slate-800">
                  {step.title}
                </h3>
                <p className="mt-1.5 max-w-[220px] text-sm leading-relaxed text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Mobile/tablet: vertical */}
      <div className="mt-8 space-y-0 lg:hidden">
        {STEPS.map((step, i) => (
          <FadeIn key={step.num} delay={i * 0.05}>
            <div className="relative flex gap-4 pb-8 last:pb-0">
              {i < STEPS.length - 1 && (
                <span className="absolute left-[27px] top-14 h-[calc(100%-3.5rem)] w-0.5 bg-slate-200" aria-hidden />
              )}
              <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-white shadow-[0_4px_16px_rgba(20,18,31,0.06)]">
                <span className="text-[var(--primary)]">{step.icon}</span>
                <span className="font-display absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-[10px] font-bold text-white">
                  {step.num}
                </span>
              </div>
              <div className="pt-1.5">
                <h3 className="font-display text-base font-bold text-slate-800">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.desc}</p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
