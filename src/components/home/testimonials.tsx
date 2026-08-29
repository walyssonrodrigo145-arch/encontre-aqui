import { Star } from "lucide-react";
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

export function Testimonials({ reviews }: { reviews: TestimonialData[] }) {
  if (reviews.length === 0) return null;

  return (
    <section id="depoimentos" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-12 md:px-6 md:py-16">
      <FadeIn>
        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-slate-900 md:text-2xl">Quem usa, recomenda.</h2>
          <p className="mt-1 text-[15px] text-slate-500">
            Avaliações reais de clientes que contrataram pela plataforma.
          </p>
        </div>
      </FadeIn>

      <Stagger className="mt-8 grid gap-4 md:grid-cols-3" gap={0.08}>
        {reviews.map((r) => (
          <StaggerItem key={r.id}>
            <figure className="card card-hover flex h-full flex-col p-5">
              <Stars rating={r.rating} size={15} />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                “{r.comment}”
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                <Avatar name={r.authorName} size={38} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-700">{r.authorName}</p>
                  <p className="truncate text-xs text-slate-400">
                    {r.serviceName ?? "Serviço"} · {r.providerName}
                  </p>
                </div>
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
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
