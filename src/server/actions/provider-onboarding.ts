"use server";

import { friendlyError } from "@/server/errors";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  blockedDates,
  portfolio,
  providerAvailability,
  providerServices,
  providers,
  services,
} from "@/lib/schema";
import { requireRole } from "@/lib/auth";
import { toNumberOrUndefined } from "@/lib/utils";

export interface OnboardingState {
  error?: string;
  success?: string;
  step?: number;
}

async function getMyProvider() {
  const session = await requireRole("PROVIDER");
  const [provider] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
  if (!provider) throw new Error("FORBIDDEN");
  return provider;
}

export async function saveStep1Action(_prev: OnboardingState | undefined, formData: FormData): Promise<OnboardingState> {
  try {
    const provider = await getMyProvider();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const whatsapp = String(formData.get("whatsapp") ?? "").trim();

    if (displayName.length < 3) return { error: "Informe seu nome profissional." };
    if (whatsapp.replace(/\D/g, "").length < 10) return { error: "WhatsApp inválido." };

    await db.update(providers).set({
      displayName,
      whatsapp,
      onboardingStep: Math.max(provider.onboardingStep, 2),
    }).where(eq(providers.id, provider.id));
    return { success: "Etapa 1 salva", step: 2 };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function saveStep2Action(_prev: OnboardingState | undefined, formData: FormData): Promise<OnboardingState> {
  try {
    const provider = await getMyProvider();
    const cep = String(formData.get("cep") ?? "").replace(/\D/g, "");
    const city = String(formData.get("city") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim().toUpperCase();
    const neighborhood = String(formData.get("neighborhood") ?? "").trim();
    const addressText = String(formData.get("addressText") ?? "").trim();
    const lat = toNumberOrUndefined(formData.get("lat"));
    const lng = toNumberOrUndefined(formData.get("lng"));

    if (cep.length !== 8) return { error: "CEP inválido (8 dígitos)." };
    if (city.length < 2) return { error: "Informe a cidade." };
    if (state.length !== 2) return { error: "Informe a UF (ex: MG)." };
    if (neighborhood.length < 2) return { error: "Informe o bairro." };

    await db.update(providers).set({
      cep, city, state, neighborhood,
      addressText: addressText || null,
      ...(lat != null && lng != null ? { lat, lng } : {}),
      onboardingStep: Math.max(provider.onboardingStep, 3),
    }).where(eq(providers.id, provider.id));
    return { success: "Etapa 2 salva", step: 3 };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function saveStep3Action(categoryIds: number[], subcategoryIds: number[]): Promise<OnboardingState> {
  try {
    const provider = await getMyProvider();
    if (categoryIds.length === 0 || subcategoryIds.length === 0) {
      return { error: "Selecione ao menos uma especialidade." };
    }
    await db.update(providers).set({
      onboardingStep: Math.max(provider.onboardingStep, 4),
    }).where(eq(providers.id, provider.id));
    return { success: "Etapa 3 salva", step: 4 };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function saveStep4Action(serviceIds: number[]): Promise<OnboardingState> {
  try {
    const provider = await getMyProvider();
    if (serviceIds.length === 0) return { error: "Selecione ao menos um serviço." };

    // valida que os IDs existem no catálogo (evita erro de FK vazio/exposto)
    const valid = await db
      .select({ id: services.id })
      .from(services)
      .where(inArray(services.id, serviceIds));
    if (valid.length !== new Set(serviceIds).size) {
      return { error: "Serviço inválido selecionado." };
    }

    await db.delete(providerServices).where(eq(providerServices.providerId, provider.id));
    await db.insert(providerServices).values(
      serviceIds.map((serviceId) => ({
        providerId: provider.id,
        serviceId,
        priceType: "ON_QUOTE" as const,
      })),
    );
    await db.update(providers).set({
      onboardingStep: Math.max(provider.onboardingStep, 5),
    }).where(eq(providers.id, provider.id));
    return { success: "Serviços salvos", step: 5 };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function saveStep5Action(_prev: OnboardingState | undefined, formData: FormData): Promise<OnboardingState> {
  try {
    const provider = await getMyProvider();
    const headline = String(formData.get("headline") ?? "").trim();
    const bio = String(formData.get("bio") ?? "").trim();
    const experienceYears = Number(formData.get("experienceYears")) || undefined;
    const certifications = String(formData.get("certifications") ?? "").trim() || undefined;

    if (headline.length < 5) return { error: "Escreva um título profissional curto (ex: 'Eletricista residencial')." };
    if (bio.length < 20) return { error: "Descreva sua experiência (mínimo 20 caracteres)." };

    await db.update(providers).set({
      headline, bio, experienceYears, certifications,
      onboardingStep: Math.max(provider.onboardingStep, 6),
    }).where(eq(providers.id, provider.id));
    return { success: "Etapa 5 salva", step: 6 };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function saveStep6Action(items: { description: string }[]): Promise<OnboardingState> {
  try {
    const provider = await getMyProvider();
    await db.delete(portfolio).where(eq(portfolio.providerId, provider.id));
    if (items.length > 0) {
      await db.insert(portfolio).values(
        items.map((item, i) => ({
          providerId: provider.id,
          mediaUrl: "",
          description: item.description.slice(0, 300),
          sortOrder: i,
        })),
      );
    }
    await db.update(providers).set({
      onboardingStep: Math.max(provider.onboardingStep, 7),
    }).where(eq(providers.id, provider.id));
    return { success: "Portfólio salvo", step: 7 };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function saveStep7Action(_prev: OnboardingState | undefined, formData: FormData): Promise<OnboardingState> {
  try {
    const provider = await getMyProvider();
    const priceType = String(formData.get("priceType") ?? "ON_QUOTE") as "FIXED" | "RANGE" | "ON_QUOTE";
    const priceMin = Math.round(Number(String(formData.get("priceMin") ?? "0").replace(",", ".")) * 100) || null;
    const priceMax = Math.round(Number(String(formData.get("priceMax") ?? "0").replace(",", ".")) * 100) || null;

    if (priceType === "FIXED" && !priceMin) return { error: "Informe o preço." };
    if (priceType === "RANGE" && (!priceMin || !priceMax)) return { error: "Informe a faixa de preço." };
    if (priceType === "RANGE" && priceMin && priceMax && priceMin > priceMax) {
      return { error: "Preço mínimo maior que o máximo." };
    }

    const links = await db
      .select()
      .from(providerServices)
      .where(eq(providerServices.providerId, provider.id));
    for (const link of links) {
      await db
        .update(providerServices)
        .set({ priceType, priceMin: priceType === "ON_QUOTE" ? null : priceMin, priceMax: priceType === "RANGE" ? priceMax : null })
        .where(eq(providerServices.id, link.id));
    }

    await db.update(providers).set({
      onboardingStep: Math.max(provider.onboardingStep, 8),
    }).where(eq(providers.id, provider.id));
    return { success: "Preços salvos", step: 8 };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function saveStep8Action(
  availability: { weekday: number; startTime: string; endTime: string; slotMinutes: number }[],
  emergency: boolean,
  serviceRadiusKm: number,
): Promise<OnboardingState> {
  try {
    const provider = await getMyProvider();
    const HHMM = /^\d{2}:\d{2}$/;
    const seenWeekdays = new Set<number>();
    const active = availability.filter((a) => {
      if (!Number.isInteger(a.weekday) || a.weekday < 0 || a.weekday > 6) return false;
      if (!HHMM.test(a.startTime) || !HHMM.test(a.endTime)) return false;
      if (a.startTime >= a.endTime) return false;
      if (!Number.isInteger(a.slotMinutes) || a.slotMinutes < 15 || a.slotMinutes > 480) return false;
      if (seenWeekdays.has(a.weekday)) return false; // uma janela por dia (evita slot ambíguo)
      seenWeekdays.add(a.weekday);
      return true;
    });
    if (active.length === 0) return { error: "Configure ao menos um dia de atendimento." };

    await db.delete(providerAvailability).where(eq(providerAvailability.providerId, provider.id));
    await db.insert(providerAvailability).values(
      active.map((a) => ({
        providerId: provider.id,
        weekday: a.weekday,
        startTime: a.startTime,
        endTime: a.endTime,
        slotMinutes: a.slotMinutes,
      })),
    );
    await db.update(providers).set({
      emergency,
      serviceRadiusKm: Math.min(Math.max(serviceRadiusKm, 1), 200),
      status: "PENDING",
      onboardingStep: 8,
    }).where(eq(providers.id, provider.id));

    return { success: "Cadastro enviado para análise!" };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function addBlockedDateAction(date: string, reason?: string): Promise<OnboardingState> {
  try {
    const provider = await getMyProvider();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Data inválida." };
    const today = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10); // hoje em BRT
    if (date < today) return { error: "Escolha uma data futura." };

    const [existing] = await db
      .select({ id: blockedDates.id })
      .from(blockedDates)
      .where(and(eq(blockedDates.providerId, provider.id), eq(blockedDates.date, date)))
      .limit(1);
    if (existing) return { error: "Esta data já está bloqueada." };

    await db.insert(blockedDates).values({ providerId: provider.id, date, reason });
    revalidatePath("/prestador/agenda");
    return { success: "Data bloqueada." };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function removeBlockedDateAction(id: number): Promise<OnboardingState> {
  try {
    const provider = await getMyProvider();
    await db.delete(blockedDates).where(and(eq(blockedDates.id, id), eq(blockedDates.providerId, provider.id)));
    revalidatePath("/prestador/agenda");
    return { success: "Data liberada." };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}
