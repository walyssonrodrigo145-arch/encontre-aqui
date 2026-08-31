import { BadgeCheck, Quote, Star } from "lucide-react";
import { Avatar } from "@/components/ui";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";

export interface TestimonialData {
  id: number;
  rating: number;
  comment: string | null;
  authorName: string;
  providerName: string;
  serviceName: string | null;
}

function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Nota ${rating} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={
            i <= Math.round(rating)
              ? "fill-[var(--accent)] text-[var(--accent)]"
              : "fill-slate-200 text-slate-200"
          }
        />
      ))}
    </span>
  );
}

export function Testimonials({ reviews }: { reviews: TestimonialData[] }) {
  if (reviews.length === 0) return null;

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section id="depoimentos" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-12 md:px-6 md:py-16">
      <FadeIn>
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/15 bg-[var(--primary-soft)] px-4 py-1.5 text-[13px] font-semibold text-[var(--primary-dark)]">
              Depoimentos
            </span>
            <h2 className="font-display mt-4 text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl">
              Quem usa, <span className="text-brand-gradient">recomenda.</span>
            </h2>
            <p className="mt-1.5 text-[15px] text-slate-500">
              Avaliações reais de clientes que contrataram pela plataforma.
            </p>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--border)] bg-white px-5 py-3.5 shadow-sm">
            <span className="font-display text-3xl font-extrabold text-slate-900">
              {avg.toFixed(1).replace(".", ",")}
            </span>
            <span>
              <Stars rating={avg} size={13} />
              <span className="mt-0.5 block text-xs text-slate-400">
                média das avaliações em destaque
              </span>
            </span>
          </div>
        </div>
      </FadeIn>

      <Stagger className="mt-8 grid gap-4 md:grid-cols-3" gap={0.08}>
        {reviews.map((r) => (
          <StaggerItem key={r.id}>
            <figure className="card card-hover relative flex h-full flex-col overflow-hidden p-5">
              <Quote
                className="pointer-events-none absolute -bottom-2 -right-2 h-20 w-20 text-[var(--primary)]/[0.06]"
                aria-hidden
              />
              <Stars rating={r.rating} size={15} />
              <blockquote className="relative mt-3 flex-1 text-[15px] leading-relaxed text-slate-700">
                “{r.comment}”
              </blockquote>
              <figcaption className="relative mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                <Avatar name={r.authorName} size={38} className="ring-2 ring-[var(--primary-soft)]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{r.authorName}</p>
                  <p className="truncate text-xs text-slate-400">
                    {r.serviceName ?? "Serviço"} · {r.providerName}
                  </p>
                </div>
                <span
                  className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
                  title="Cliente que contratou pela plataforma"
                >
                  <BadgeCheck size={15} />
                </span>
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
