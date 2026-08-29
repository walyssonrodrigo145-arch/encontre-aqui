import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  boosts,
  providerAvailability,
  providerServices,
  providers,
  rankingConfig,
  services,
  subcategories,
  categories,
} from "@/lib/schema";
import { haversineKm } from "@/lib/utils";

export interface SearchParams {
  query?: string;
  lat?: number;
  lng?: number;
  city?: string;
  categoryId?: number;
  maxDistanceKm?: number;
  minRating?: number;
  emergencyOnly?: boolean;
  verifiedOnly?: boolean;
  availableToday?: boolean;
  sort?: "relevance" | "distance" | "rating";
}

export interface RankedProvider {
  id: number;
  userId: number;
  displayName: string;
  slug: string;
  headline: string | null;
  city: string;
  state: string;
  neighborhood: string | null;  verificationLevel: string;
  emergency: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedJobs: number;
  priceMin: number | null;
  priceMax: number | null;
  distanceKm: number | null;
  boosted: boolean;
  featured: boolean;
  availableToday: boolean;
  score: number;
  matchedService: string | null;
}

interface RankingWeights {
  w_service_match: number;
  w_distance: number;
  w_rating: number;
  w_response: number;
  w_completeness: number;
  w_plan: number;
  boost_cap: number;
}

export async function getRankingWeights(): Promise<RankingWeights> {
  const rows = await db.select().from(rankingConfig);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    w_service_match: map.w_service_match ?? 0.3,
    w_distance: map.w_distance ?? 0.25,
    w_rating: map.w_rating ?? 0.2,
    w_response: map.w_response ?? 0.1,
    w_completeness: map.w_completeness ?? 0.1,
    w_plan: map.w_plan ?? 0.05,
    boost_cap: map.boost_cap ?? 0.3,
  };
}

const planBoostByPlanId = new Map<number, number>([
  [1, 0], // basico
  [2, 0.6], // profissional
  [3, 1], // premium
]);

export async function searchProviders(params: SearchParams): Promise<RankedProvider[]> {
  const w = await getRankingWeights();

  // resolve consulta textual → serviceIds + prestadores por nome
  let matchedServiceIds: number[] = [];
  let matchedServiceNames = new Map<number, string>();
  let nameMatchedProviderIds: number[] = [];
  if (params.query?.trim()) {
    const q = `%${params.query.trim()}%`;
    const matches = await db
      .select({ id: services.id, name: services.name })
      .from(services)
      .where(sql`${services.name} LIKE ${q} COLLATE NOCASE`)
      .limit(30);
    if (matches.length === 0) {
      const subMatches = await db
        .select({ id: services.id, name: services.name })
        .from(services)
        .innerJoin(subcategories, eq(services.subcategoryId, subcategories.id))
        .where(sql`${subcategories.name} LIKE ${q} COLLATE NOCASE`)
        .limit(30);
      matches.push(...subMatches);
    }
    if (matches.length === 0) {
      const catMatches = await db
        .select({ id: services.id, name: services.name })
        .from(services)
        .innerJoin(subcategories, eq(services.subcategoryId, subcategories.id))
        .innerJoin(categories, eq(subcategories.categoryId, categories.id))
        .where(sql`${categories.name} LIKE ${q} COLLATE NOCASE`)
        .limit(50);
      matches.push(...catMatches);
    }
    matchedServiceIds = matches.map((m) => m.id);
    matchedServiceNames = new Map(matches.map((m) => [m.id, m.name]));

    // nome/título do prestador também é buscável
    const byName = await db
      .select({ id: providers.id })
      .from(providers)
      .where(
        sql`(${providers.displayName} LIKE ${q} COLLATE NOCASE OR ${providers.headline} LIKE ${q} COLLATE NOCASE)`,
      )
      .limit(50);
    nameMatchedProviderIds = byName.map((r) => r.id);
  }

  if (params.query?.trim() && matchedServiceIds.length === 0 && nameMatchedProviderIds.length === 0) {
    return [];
  }

  // base: prestadores aprovados
  const all = await db
    .select()
    .from(providers)
    .where(and(eq(providers.status, "APPROVED")));

  if (all.length === 0) return [];

  const providerIds = all.map((p) => p.id);
  const svcLinks = await db
    .select()
    .from(providerServices)
    .where(inArray(providerServices.providerId, providerIds));

  const linksByProvider = new Map<number, typeof svcLinks>();
  for (const link of svcLinks) {
    const list = linksByProvider.get(link.providerId) ?? [];
    list.push(link);
    linksByProvider.set(link.providerId, list);
  }

  // boosts ativos
  const now = new Date();
  const activeBoosts = await db
    .select()
    .from(boosts)
    .where(and(eq(boosts.status, "ACTIVE"), sql`${boosts.endsAt} > ${now.getTime()}`));
  const boostByProvider = new Map(activeBoosts.map((b) => [b.providerId, b]));

  const today = new Date();

  // prestadores com agenda ativa no dia corrente (uma query para todos)
  const weekdayNow = today.getDay();
  const availRows = await db
    .select({ providerId: providerAvailability.providerId })
    .from(providerAvailability)
    .where(
      and(
        eq(providerAvailability.weekday, weekdayNow),
        eq(providerAvailability.isActive, true),
        inArray(providerAvailability.providerId, providerIds),
      ),
    );
  const availableTodaySet = new Set(availRows.map((r) => r.providerId));

  const ranked: RankedProvider[] = [];
  for (const p of all) {
    const links = linksByProvider.get(p.id) ?? [];

    // filtro por serviço pesquisado (ou match por nome do prestador)
    let matchedLink = null as (typeof svcLinks)[number] | null;
    let matchedServiceName: string | null = null;
    if (params.query?.trim()) {
      matchedLink = links.find((l) => matchedServiceIds.includes(l.serviceId)) ?? null;
      const byName = nameMatchedProviderIds.includes(p.id);
      if (!matchedLink && !byName) continue;
      matchedServiceName = matchedLink
        ? matchedServiceNames.get(matchedLink.serviceId) ?? null
        : null;
    }

    // distância
    let distanceKm: number | null = null;
    if (params.lat != null && params.lng != null && p.lat != null && p.lng != null) {
      distanceKm = haversineKm(params.lat, params.lng, p.lat, p.lng);
    }
    if (distanceKm != null && distanceKm > p.serviceRadiusKm) continue;
    if (distanceKm != null && params.maxDistanceKm != null && distanceKm > params.maxDistanceKm) continue;

    // filtros simples
    if (params.minRating != null && p.ratingAvg < params.minRating) continue;
    if (params.emergencyOnly && !p.emergency) continue;
    if (params.verifiedOnly && p.verificationLevel === "NONE") continue;
    if (params.city?.trim() && !(p.city ?? "").toLowerCase().includes(params.city.trim().toLowerCase())) continue;
    if (params.categoryId != null) {
      const catSvcIds = (
        await db
          .select({ id: services.id })
          .from(services)
          .innerJoin(subcategories, eq(services.subcategoryId, subcategories.id))
          .where(eq(subcategories.categoryId, params.categoryId))
      ).map((r) => r.id);
      if (!links.some((l) => catSvcIds.includes(l.serviceId))) continue;
    }

    // disponibilidade hoje (simplificada: tem agenda no dia da semana)
    if (params.availableToday) {
      // verificada na renderização via availability cache — trata como verdadeiro se tem agenda
    }

    // ── score ──
    const serviceMatch = matchedLink ? 1 : links.length > 0 ? 0.6 : 0.3;
    const proximity =
      distanceKm == null
        ? 0.5
        : Math.max(0, 1 - distanceKm / Math.max(p.serviceRadiusKm, 1));
    const ratingScore = p.ratingCount > 0 ? (p.ratingAvg / 5) * Math.min(1, p.ratingCount / 20) : 0;
    const responseScore = p.responseRate;
    const completeness =
      ((p.bio ? 0.3 : 0) +
        (p.headline ? 0.2 : 0) +
        (links.length > 0 ? 0.25 : 0) +
        (p.ratingCount > 0 ? 0.15 : 0) +
        (p.verificationLevel !== "NONE" ? 0.1 : 0));
    const planScore = p.planId ? (planBoostByPlanId.get(p.planId) ?? 0) : 0;

    const boost = boostByProvider.get(p.id);
    const boostFactor = boost
      ? Math.min(boost.multiplier * (1 + (p.ratingAvg / 5) * 0.5), w.boost_cap)
      : 0;

    const base =
      w.w_service_match * serviceMatch +
      w.w_distance * proximity +
      w.w_rating * ratingScore +
      w.w_response * responseScore +
      w.w_completeness * completeness +
      w.w_plan * planScore;
    const score = base * (1 + boostFactor);

    ranked.push({
      id: p.id,
      userId: p.userId,
      displayName: p.displayName,
      slug: p.slug,
      headline: p.headline,
      city: p.city ?? "",
      state: p.state ?? "",
      neighborhood: p.neighborhood,
      verificationLevel: p.verificationLevel,
      emergency: p.emergency,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      completedJobs: p.completedJobs,
      priceMin: matchedLink?.priceMin ?? null,
      priceMax: matchedLink?.priceMax ?? null,
      distanceKm,
      boosted: !!boost,
      featured: p.planId === 3,
      availableToday: availableTodaySet.has(p.id),
      score,
      matchedService: matchedServiceName,
    });
  }

  const sort = params.sort ?? "relevance";
  ranked.sort((a, b) => {
    if (sort === "distance") return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    if (sort === "rating") return b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount;
    return b.score - a.score;
  });

  return ranked;
}
