import { Scale, ShieldCheck, Star, Zap } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";

const BENEFITS = [
  {
    icon: <ShieldCheck size={22} />,
    title: "Profissionais verificados",
    desc: "Perfis analisados pela nossa equipe com documentos e telefone confirmados antes de aparecer nas buscas.",
    accent: "bg-[var(--primary-soft)] text-[var(--primary)]",
  },
  {
    icon: <Star size={22} />,
    title: "Avaliações reais",
    desc: "Só é possível avaliar quem contratou de verdade. Notas e comentários refletem serviços concluídos na plataforma.",
    accent: "bg-amber-50 text-amber-600",
  },
  {
    icon: <Zap size={22} />,
    title: "Resposta rápida",
    desc: "Solicite orçamento sem compromisso e receba propostas em minutos. Precisa de urgência? Filtre prestadores de emergência.",
    accent: "bg-blue-50 text-blue-600",
  },
  {
    icon: <Scale size={22} />,
    title: "Preço justo, sem surpresa",
    desc: "Compare propostas, faixas de preço e avaliações antes de decidir. Você escolhe a melhor combinação de custo e qualidade.",
    accent: "bg-emerald-50 text-emerald-600",
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="mx-auto w-full max-w-7xl px-4 py-14 md:px-6 md:py-20">
      <FadeIn>
        <span className="badge bg-[var(--primary-soft)] px-3.5 py-1.5 font-medium text-[var(--primary-dark)]">
          Por que usar o Encontre Aqui
        </span>
        <h2 className="font-display mt-4 max-w-2xl text-2xl font-extrabold leading-tight text-slate-900 md:text-4xl">
          Contratar um profissional nunca foi tão <span className="text-brand-gradient">simples e seguro</span>
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 md:text-base">
          Reunimos tudo o que você precisa para decidir com confiança: verificação, avaliações reais
          e comparação transparente de preços.
        </p>
      </FadeIn>

      <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.08}>
        {BENEFITS.map((b) => (
          <StaggerItem key={b.title}>
            <div className="card card-hover h-full p-5">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${b.accent}`}>
                {b.icon}
              </span>
              <h3 className="font-display mt-4 text-base font-bold text-slate-800">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{b.desc}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
