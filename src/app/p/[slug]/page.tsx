import { notFound } from "next/navigation";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarCheck,
  Check,
  FileText,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  categories,
  portfolio,
  providerAvailability,
  providerServices,
  providers,
  reviews,
  services,
  subcategories,
  users,
} from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { formatDate, WEEKDAYS } from "@/lib/utils";
import { Navbar, Footer, MobileTabBar, TabBarSpacer } from "@/components/navbar";
import { Avatar, Stars } from "@/components/ui";
import { FavoriteHeart } from "@/components/favorite-heart";
import { ProfileViewTracker } from "@/components/profile-view-tracker";
import { WhatsAppContactLink } from "@/components/whatsapp-contact";
import { StaticMap } from "@/components/map";
import { isFavoriteAction } from "@/server/actions/favorites";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const [p] = await db.select().from(providers).where(eq(providers.slug, slug)).limit(1);
  if (!p) return { title: "Profissional não encontrado" };
  return {
    title: `${p.displayName} — ${p.headline ?? "Profissional"}`,
    description: p.bio ?? undefined,
  };
}

export default async function ProviderProfilePage({ params }: Props) {
  const { slug } = await params;
  const [provider] = await db.select().from(providers).where(eq(providers.slug, slug)).limit(1);
  if (!provider || provider.status !== "APPROVED") notFound();

  const session = await getVerifiedSession();

  const [svcRows, portfolioRows, reviewRows, availability, userRow] = await Promise.all([
    db
      .select({
        serviceId: services.id,
        serviceName: services.name,
        subName: subcategories.name,
        catName: categories.name,
        priceType: providerServices.priceType,
        priceMin: providerServices.priceMin,
        priceMax: providerServices.priceMax,
      })
      .from(providerServices)
      .innerJoin(services, eq(providerServices.serviceId, services.id))
      .innerJoin(subcategories, eq(services.subcategoryId, subcategories.id))
      .innerJoin(categories, eq(subcategories.categoryId, categories.id))
      .where(eq(providerServices.providerId, provider.id)),
    db.select().from(portfolio).where(eq(portfolio.providerId, provider.id)).orderBy(portfolio.sortOrder),
    db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        authorName: users.name,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.authorId, users.id))
      .where(and(eq(reviews.providerId, provider.id), eq(reviews.status, "VISIBLE")))
      .orderBy(desc(reviews.createdAt))
      .limit(8),
    db.select().from(providerAvailability).where(eq(providerAvailability.providerId, provider.id)),
    db.select({ phone: users.phone, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, provider.userId)).limit(1),
  ]);

  const isFav = session?.role === "CUSTOMER" ? await isFavoriteAction(provider.id) : false;

  const grouped = new Map<string, typeof svcRows>();
  for (const s of svcRows) {
    const list = grouped.get(s.catName) ?? [];
    list.push(s);
    grouped.set(s.catName, list);
  }

  const availByDay = new Map<number, typeof availability>();
  for (const a of availability) {
    const list = availByDay.get(a.weekday) ?? [];
    list.push(a);
    availByDay.set(a.weekday, list);
  }

  const stats = [
    { value: String(provider.completedJobs), label: "Serviços" },
    { value: provider.experienceYears != null ? `${provider.experienceYears} anos` : "—", label: "Experiência" },
    { value: provider.city ?? "—", label: "Atende esta região" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <ProfileViewTracker providerId={provider.id} />
      {/* Header gradiente mobile */}
      <div className="bg-brand-gradient flex items-center justify-between px-4 pb-2 pt-5 md:hidden">
        <Link href="/busca" className="rounded-full p-1.5 text-white transition hover:bg-white/15" aria-label="Voltar">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-sm font-semibold text-white">Perfil</span>
        <div className="w-9" />
      </div>

      <Navbar />

      {/* ─── Capa + identidade ─── */}
      <section className="bg-brand-gradient px-4 pb-14 pt-3 md:pb-20 md:pt-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-end gap-2">
            {session?.role === "CUSTOMER" && (
              <FavoriteHeart providerId={provider.id} initial={isFav} className="glass text-white" />
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <div className="-mt-12 md:-mt-16">
          {/* Identidade */}
          <div className="card relative p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative -mt-14 sm:-mt-20">
                <Avatar
                  name={provider.displayName}
                  src={userRow[0]?.avatarUrl}
                  size={96}
                  className="rounded-3xl border-4 border-white shadow-xl shadow-[var(--primary)]/20 md:h-28 md:w-28"
                />
                {provider.verificationLevel !== "NONE" && (
                  <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--success)] text-white ring-4 ring-white" title={provider.verificationLevel === "DOCUMENTS" ? "Documentação verificada" : "Perfil verificado"}>
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className="flex-1 pb-1">
                {provider.verificationLevel !== "NONE" && (
                  <span className="badge-success mb-1.5 inline-flex items-center gap-1">
                    <BadgeCheck size={13} /> Verificado
                  </span>
                )}
                <h1 className="font-display flex items-center gap-1.5 text-xl font-extrabold text-slate-900 md:text-2xl">
                  {provider.displayName}
                </h1>
                <p className="text-sm text-slate-500">{provider.headline}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <Star size={14} className="fill-[var(--accent)] text-[var(--accent)]" />
                    <b className="text-slate-800">{provider.ratingAvg.toFixed(1).replace(".", ",")}</b>
                    <span className="text-slate-400">({provider.ratingCount} avaliações)</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <MapPin size={12} /> {provider.city} - {provider.state}
                  </span>
                  {provider.emergency && (
                    <span className="badge bg-red-50 font-semibold text-[var(--danger)]">
                      <Zap size={12} /> Atende emergências
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl bg-[var(--primary-soft)] py-3">
              {stats.map((s) => (
                <div key={s.label} className="px-2 text-center">
                  <p className="font-display truncate text-sm font-extrabold text-slate-900 md:text-base">{s.value}</p>
                  <p className="text-[10px] text-slate-500 md:text-xs">{s.label}</p>
                </div>
              ))}
            </div>

            {/* CTAs (desktop/tablet) — no mobile existe a barra fixa inferior */}
            {(!session || session.role === "CUSTOMER") && (
              <div className="mt-4 hidden flex-wrap gap-2 md:flex">
                <Link href={`/agendar?prestador=${provider.id}`} className="btn-gradient min-w-[180px] flex-1">
                  <CalendarCheck size={16} /> Agendar serviço
                </Link>
                <Link href={`/solicitar-orcamento?prestador=${provider.id}`} className="btn-outline flex-1">
                  <FileText size={16} /> Solicitar orçamento
                </Link>
                <Link href={`/mensagens?prestador=${provider.id}`} className="btn-outline flex-1">
                  <MessageCircle size={16} /> Enviar mensagem
                </Link>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4 pb-28 lg:grid-cols-3 md:pb-0">
            {/* Coluna principal */}
            <div className="space-y-4 lg:col-span-2">
              <section className="card p-5">
                <h2 className="font-display font-bold text-slate-800">Sobre</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {provider.bio ?? "Profissional ainda não adicionou uma descrição."}
                </p>
                {provider.certifications && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-500">
                    <ShieldCheck size={14} className="text-[var(--primary)]" /> {provider.certifications}
                  </p>
                )}
              </section>

              <section className="card p-5">
                <h2 className="font-display font-bold text-slate-800">Serviços oferecidos</h2>
                {grouped.size === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">Nenhum serviço cadastrado ainda.</p>
                ) : (
                  <div className="mt-3 space-y-4">
                    {[...grouped.entries()].map(([cat, list]) => (
                      <div key={cat}>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{cat}</p>
                        <ul className="mt-2 space-y-1.5">
                          {list.slice(0, 4).map((s) => (
                            <li key={s.serviceId} className="flex items-center gap-2 text-sm">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                <Check size={12} strokeWidth={3} />
                              </span>
                              <span className="text-slate-600">{s.serviceName}</span>
                            </li>
                          ))}
                        </ul>
                        {list.length > 4 && (
                          <p className="mt-1.5 text-xs font-semibold text-[var(--primary)]">
                            + {list.length - 4} serviços
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {portfolioRows.length > 0 && (
                <section className="card p-5">
                  <h2 className="font-display font-bold text-slate-800">Portfólio</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {portfolioRows.map((item) => (
                      <figure key={item.id} className="overflow-hidden rounded-xl border border-[var(--border)]">
                        <div className="flex h-24 items-center justify-center bg-gradient-to-br from-[var(--primary-soft)] to-slate-100 text-3xl">
                          📷
                        </div>
                        {item.description && (
                          <figcaption className="p-2 text-xs text-slate-500">{item.description}</figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                </section>
              )}

              {/* Ponto fixo público no mapa */}
              {provider.publicLocation && provider.lat != null && provider.lng != null && (
                <section className="card p-5">
                  <h2 className="font-display font-bold text-slate-800">Local de atendimento</h2>
                  {provider.addressText && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <MapPin size={14} className="text-[var(--primary)]" /> {provider.addressText}
                      {provider.neighborhood ? ` · ${provider.neighborhood}` : ""} — {provider.city}/{provider.state}
                    </p>
                  )}
                  {!provider.addressText && provider.neighborhood && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <MapPin size={14} className="text-[var(--primary)]" /> {provider.neighborhood} — {provider.city}/{provider.state}
                    </p>
                  )}
                  <div className="relative z-0 mt-3">
                    <StaticMap lat={provider.lat} lng={provider.lng} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Localização informada pelo profissional.
                  </p>
                </section>
              )}

              <section className="card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-slate-800">Avaliações</h2>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <b>{provider.ratingAvg.toFixed(1).replace(".", ",")}</b>
                    <Stars rating={provider.ratingAvg} size={13} />
                  </span>
                </div>
                {reviewRows.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">Ainda sem avaliações.</p>
                ) : (
                  <ul className="mt-3 space-y-4">
                    {reviewRows.map((r) => (
                      <li key={r.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <Avatar name={r.authorName} size={32} />
                          <div>
                            <p className="text-sm font-semibold text-slate-700">{r.authorName}</p>
                            <p className="text-xs text-slate-400">{formatDate(r.createdAt, false)}</p>
                          </div>
                          <span className="ml-auto">
                            <Stars rating={r.rating} size={12} />
                          </span>
                        </div>
                        {r.comment && <p className="mt-2 text-sm text-slate-600">{r.comment}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {/* Sidebar (desktop) */}
            <div className="hidden space-y-4 lg:block">
              <section className="card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-slate-800">Disponibilidade</h2>
                  {availByDay.size > 0 && (!session || session.role === "CUSTOMER") && (
                    <Link
                      href={`/agendar?prestador=${provider.id}`}
                      className="text-xs font-semibold text-[var(--primary)] hover:underline"
                    >
                      Ver horários livres
                    </Link>
                  )}
                </div>
                {availByDay.size === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">Agenda não configurada.</p>
                ) : (
                  <ul className="mt-3 space-y-1.5 text-sm">
                    {WEEKDAYS.map((dayName, wd) => {
                      const slots = availByDay.get(wd);
                      return (
                        <li key={dayName} className="flex justify-between">
                          <span className="text-slate-500">{dayName}</span>
                          <span className={slots ? "font-medium text-slate-700" : "text-slate-300"}>
                            {slots ? slots.map((s) => `${s.startTime}–${s.endTime}`).join(", ") : "Fechado"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="card p-5">
                <h2 className="font-display font-bold text-slate-800">Área de atendimento</h2>
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
                  <MapPin size={14} className="text-[var(--primary)]" />
                  {provider.city} - {provider.state} · raio de {provider.serviceRadiusKm} km
                </p>
              </section>

              <section className="card p-5">
                <h2 className="font-display font-bold text-slate-800">Contato</h2>
                {(provider.whatsapp ?? userRow[0]?.phone ?? "").replace(/\D/g, "").length >= 10 ? (
                  <>
                    <WhatsAppContactLink
                      providerId={provider.id}
                      phoneDigits={(provider.whatsapp ?? userRow[0]?.phone ?? "").replace(/\D/g, "")}
                      className="btn-outline mt-3 w-full"
                    >
                      <Phone size={16} /> WhatsApp
                    </WhatsAppContactLink>
                    <p className="mt-2 text-center text-xs text-slate-400">
                      Prefira negociar pela plataforma para ter proteção
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    Este profissional ainda não informou um telefone de contato.
                  </p>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* ─── CTAs fixos (mobile) ─── */}
      <div className="fixed inset-x-0 bottom-[62px] z-30 border-t border-slate-200/70 bg-white/95 p-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <Link href={`/mensagens?prestador=${provider.id}`} className="btn-outline flex-1" aria-label="Mensagem">
            <MessageCircle size={17} />
          </Link>
          <Link href={`/solicitar-orcamento?prestador=${provider.id}`} className="btn-outline flex-[1.2] text-xs">
            <FileText size={15} /> Orçamento
          </Link>
          <Link href={`/agendar?prestador=${provider.id}`} className="btn-gradient flex-[1.4] text-xs">
            <CalendarCheck size={15} /> Agendar serviço
          </Link>
        </div>
      </div>
      <TabBarSpacer />
      <MobileTabBar />
    </div>
  );
}
