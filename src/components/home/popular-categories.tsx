import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  hammer: <HammerSvg />,
  home: <HomeSvg />,
  laptop: <LaptopSvg />,
  car: <WrenchSvg />,
  camera: <CameraSvg />,
  "graduation-cap": <GradSvg />,
  "heart-pulse": <HeartSvg />,
};

const CATEGORY_DESC: Record<string, string> = {
  "construcao-e-reformas": "Eletricistas, encanadores, pintores e mais",
  "casa-e-domesticos": "Diaristas, montadores e marido de aluguel",
  tecnologia: "Técnicos de TI e ar-condicionado",
  automoveis: "Mecânicos e serviços veiculares",
  "eventos-e-criacao": "Fotógrafos, designers e criativos",
  "aulas-e-acompanhamento": "Professores particulares e personal",
  "saude-e-bem-estar": "Cuidadores e bem-estar em casa",
};

export interface CategoryCardData {
  id: number;
  name: string;
  slug: string;
  icon: string;
  total: number;
}

export function PopularCategories({ categories }: { categories: CategoryCardData[] }) {
  return (
    <section id="categorias" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-12 md:px-6 md:py-16">
      <FadeIn>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 md:text-2xl">
              Encontre profissionais para o que você precisa
            </h2>
            <p className="mt-1 text-[15px] text-slate-500">Explore as categorias mais procuradas.</p>
          </div>
          <Link
            href="/busca"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] hover:underline"
          >
            Ver todas as categorias <ChevronRight size={15} />
          </Link>
        </div>
      </FadeIn>

      <Stagger className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {categories.map((cat) => (
          <StaggerItem key={cat.id}>
            <Link
              href={`/busca?categoria=${cat.id}`}
              className="card card-hover group flex items-center gap-4 p-5"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)] transition-all duration-300 group-hover:scale-105 group-hover:bg-brand-gradient group-hover:text-white group-hover:shadow-lg group-hover:shadow-[var(--primary)]/25">
                {CATEGORY_ICONS[cat.icon] ?? <DefaultSvg />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-slate-800">{cat.name}</span>
                <span className="mt-0.5 block truncate text-sm text-slate-500">
                  {CATEGORY_DESC[cat.slug] ?? "Profissionais qualificados perto de você"}
                </span>
                {cat.total > 0 && (
                  <span className="mt-1 block text-xs font-medium text-[var(--primary)]">
                    {cat.total} profissional{cat.total === 1 ? "" : "is"} disponível{cat.total === 1 ? "" : "eis"}
                  </span>
                )}
              </span>
              <ChevronRight
                size={18}
                className="shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--primary)]"
              />
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

function DefaultSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l2 2" />
    </svg>
  );
}

function HammerSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9" />
      <path d="m18 15 4-4" />
      <path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5" />
    </svg>
  );
}

function HomeSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function LaptopSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />
    </svg>
  );
}

function WrenchSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function CameraSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function GradSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  );
}

function HeartSvg() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </svg>
  );
}
