"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  portfolio,
  providerAvailability,
  providerServices,
  providers,
  services,
  subscriptionPlans,
} from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { friendlyError } from "@/server/errors";

export interface ProfileState {
  error?: string;
  success?: string;
}

/** Limite de portfólio: plano ativo ou 6 por padrão (sem plano). */
const DEFAULT_PORTFOLIO_LIMIT = 6;
const MAX_IMAGE_CHARS = 1_500_000; // ~1.1MB por imagem em data-URL

interface AvailabilityRule {
  weekday: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}

function validateAvailability(rules: AvailabilityRule[]): { ok: AvailabilityRule[]; error?: string } {
  const HHMM = /^\d{2}:\d{2}$/;
  const seen = new Set<number>();
  const ok: AvailabilityRule[] = [];
  for (const a of rules) {
    if (!Number.isInteger(a.weekday) || a.weekday < 0 || a.weekday > 6) return { ok: [], error: "Dia da semana inválido." };
    if (!HHMM.test(a.startTime) || !HHMM.test(a.endTime)) return { ok: [], error: "Horário inválido." };
    if (a.startTime >= a.endTime) return { ok: [], error: "A hora de início deve ser antes da de fim." };
    if (!Number.isInteger(a.slotMinutes) || a.slotMinutes < 15 || a.slotMinutes > 480) {
      return { ok: [], error: "Duração do slot deve estar entre 15 e 480 minutos." };
    }
    if (seen.has(a.weekday)) return { ok: [], error: "Use apenas uma janela por dia da semana." };
    seen.add(a.weekday);
    ok.push(a);
  }
  return { ok };
}

async function getProviderWithPlan() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) throw new Error("FORBIDDEN");
  const [plan] = provider.planId
    ? await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, provider.planId)).limit(1)
    : [null];
  return { session, provider, plan };
}

/** Salva a disponibilidade semanal (sem tocar em status/onboarding). */
export async function saveAvailabilityAction(
  rules: AvailabilityRule[],
  emergency: boolean,
  serviceRadiusKm: number,
): Promise<ProfileState> {
  try {
    const { provider } = await getProviderWithPlan();
    if (provider.status !== "APPROVED") return { error: "Sua conta precisa estar aprovada." };

    const { ok, error } = validateAvailability(rules);
    if (error) return { error };
    if (ok.length === 0) return { error: "Configure ao menos um dia de atendimento." };

    const radius = Math.min(Math.max(Math.round(serviceRadiusKm), 1), 200);

    await db.transaction(async (tx) => {
      await tx.delete(providerAvailability).where(eq(providerAvailability.providerId, provider.id));
      await tx.insert(providerAvailability).values(
        ok.map((a) => ({
          providerId: provider.id,
          weekday: a.weekday,
          startTime: a.startTime,
          endTime: a.endTime,
          slotMinutes: a.slotMinutes,
        })),
      );
      await tx
        .update(providers)
        .set({ emergency, serviceRadiusKm: radius })
        .where(eq(providers.id, provider.id));
    });

    revalidatePath("/prestador/perfil");
    revalidatePath("/prestador/agenda");
    return { success: "Disponibilidade salva!" };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export interface ServiceLinkInput {
  serviceId: number;
  priceType: "FIXED" | "RANGE" | "ON_QUOTE";
  priceMin?: number | null;
  priceMax?: number | null;
}

/** Sincroniza serviços + preços do prestador com o catálogo. */
export async function saveServicesAction(items: ServiceLinkInput[]): Promise<ProfileState> {
  try {
    const { provider } = await getProviderWithPlan();
    if (provider.status !== "APPROVED") return { error: "Sua conta precisa estar aprovada." };

    const seen = new Set<number>();
    const cleaned: ServiceLinkInput[] = [];
    for (const item of items) {
      if (!Number.isInteger(item.serviceId) || item.serviceId <= 0) return { error: "Serviço inválido." };
      if (seen.has(item.serviceId)) return { error: "Serviço duplicado na lista." };
      seen.add(item.serviceId);

      if (!["FIXED", "RANGE", "ON_QUOTE"].includes(item.priceType)) return { error: "Tipo de preço inválido." };

      let priceMin: number | null = null;
      let priceMax: number | null = null;
      const price = (v?: number | null) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
      priceMin = price(item.priceMin);
      priceMax = price(item.priceMax);

      if (item.priceType === "FIXED") {
        if (!priceMin || priceMin < 100 || priceMin > 10_000_000) {
          return { error: "Informe um preço válido (mínimo R$ 1,00)." };
        }
      } else if (item.priceType === "RANGE") {
        if (!priceMin || !priceMax || priceMin < 100 || priceMax < 100) {
          return { error: "Informe os preços mín. e máx. (mínimo R$ 1,00)." };
        }
        if (priceMin >= priceMax) return { error: "O preço mínimo deve ser menor que o máximo." };
      } else {
        priceMin = null;
        priceMax = null;
      }

      cleaned.push({ serviceId: item.serviceId, priceType: item.priceType, priceMin, priceMax });
    }
    if (cleaned.length === 0) return { error: "Selecione ao menos um serviço." };

    // todos os serviceIds devem existir no catálogo
    const catalogIds = await db
      .select({ id: services.id })
      .from(services)
      .where(inArray(services.id, cleaned.map((c) => c.serviceId)));
    if (catalogIds.length !== cleaned.length) return { error: "Serviço inexistente no catálogo." };

    const keepIds = cleaned.map((c) => c.serviceId);

    await db.transaction(async (tx) => {
      // remove links que saíram da lista
      const current = await tx
        .select({ id: providerServices.id, serviceId: providerServices.serviceId })
        .from(providerServices)
        .where(eq(providerServices.providerId, provider.id));
      const toDelete = current.filter((c) => !keepIds.includes(c.serviceId)).map((c) => c.id);
      if (toDelete.length > 0) {
        await tx.delete(providerServices).where(inArray(providerServices.id, toDelete));
      }
      for (const c of cleaned) {
        await tx
          .insert(providerServices)
          .values({
            providerId: provider.id,
            serviceId: c.serviceId,
            priceType: c.priceType,
            priceMin: c.priceMin,
            priceMax: c.priceMax,
          })
          .onConflictDoUpdate({
            target: [providerServices.providerId, providerServices.serviceId],
            set: { priceType: c.priceType, priceMin: c.priceMin, priceMax: c.priceMax },
          });
      }
    });

    revalidatePath("/prestador/perfil");
    revalidatePath("/prestador/servicos");
    return { success: "Serviços e preços salvos!" };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export interface PortfolioItemInput {
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  description?: string;
}

/** Salva o portfólio respeitando o limite do plano. */
export async function savePortfolioAction(items: PortfolioItemInput[]): Promise<ProfileState> {
  try {
    const { provider, plan } = await getProviderWithPlan();
    if (provider.status !== "APPROVED") return { error: "Sua conta precisa estar aprovada." };

    const limit = plan?.maxPortfolio ?? DEFAULT_PORTFOLIO_LIMIT;
    if (items.length > limit) {
      return {
        error: `Seu plano permite até ${limit} trabalho(s) no portfólio. Remova ${items.length - limit} para salvar — ou faça upgrade do plano.`,
      };
    }

    const cleaned = items.slice(0, limit).map((item, i) => {
      const url = item.mediaUrl.trim();
      if (item.mediaType === "IMAGE") {
        // whitelist estrita (mesma do avatar) — bloqueia data:image/svg+xml e afins
        if (!/^data:image\/(png|jpe?g|webp);base64,/.test(url)) throw new Error("FORMAT");
        if (url.length > MAX_IMAGE_CHARS) throw new Error("TOO_BIG");
      } else {
        if (!/^https:\/\//.test(url)) throw new Error("FORMAT");
        if (!plan?.allowVideos) throw new Error("NO_VIDEO");
      }
      return {
        providerId: provider.id,
        mediaUrl: url,
        mediaType: item.mediaType,
        description: item.description?.trim().slice(0, 300) || null,
        sortOrder: i,
      };
    });

    await db.transaction(async (tx) => {
      await tx.delete(portfolio).where(eq(portfolio.providerId, provider.id));
      if (cleaned.length > 0) await tx.insert(portfolio).values(cleaned);
    });

    revalidatePath("/prestador/perfil");
    revalidatePath("/prestador/servicos");
    return { success: "Portfólio salvo!" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "FORMAT") return { error: "Formato de imagem inválido." };
    if (msg === "TOO_BIG") return { error: "Uma das imagens é grande demais. Tente outra foto." };
    if (msg === "NO_VIDEO") return { error: "Seu plano não permite vídeos no portfólio." };
    return { error: friendlyError(e) };
  }
}

/** Carrega dados para a página Meu perfil (limite do plano incluído). */
export async function getMyPortfolioLimit(): Promise<{ limit: number; allowVideos: boolean; planName: string | null }> {
  try {
    const { plan } = await getProviderWithPlan();
    return {
      limit: plan?.maxPortfolio ?? DEFAULT_PORTFOLIO_LIMIT,
      allowVideos: plan?.allowVideos ?? false,
      planName: plan?.name ?? null,
    };
  } catch {
    return { limit: DEFAULT_PORTFOLIO_LIMIT, allowVideos: false, planName: null };
  }
}
