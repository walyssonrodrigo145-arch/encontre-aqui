"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { customers, providers, users } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validations";
import { toNumberOrUndefined } from "@/lib/utils";
import { friendlyError } from "@/server/errors";

export interface ProfileState {
  error?: string;
  success?: string;
}

/** Foto do perfil (data URL JPEG já redimensionada no navegador). */
const AVATAR_RE = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;
const AVATAR_MAX_CHARS = 500_000; // ~370 KB em binário

export async function updateAvatarAction(dataUrl: string): Promise<{ error?: string }> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Faça login para continuar." };

  if (typeof dataUrl !== "string" || !AVATAR_RE.test(dataUrl)) {
    return { error: "Formato de imagem inválido. Use JPG, PNG ou WebP." };
  }
  if (dataUrl.length > AVATAR_MAX_CHARS) {
    return { error: "Imagem muito grande mesmo após redimensionamento." };
  }

  await db.update(users).set({ avatarUrl: dataUrl }).where(eq(users.id, session.userId));
  revalidatePath("/perfil");
  revalidatePath("/perfil/editar");
  return {};
}

export async function removeAvatarAction(): Promise<{ error?: string }> {
  const session = await getVerifiedSession();
  if (!session) return { error: "Faça login para continuar." };

  await db.update(users).set({ avatarUrl: null }).where(eq(users.id, session.userId));
  revalidatePath("/perfil");
  revalidatePath("/perfil/editar");
  return {};
}

function orUndefined(v: FormDataEntryValue | null): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export async function updateFullProfileAction(
  _prev: ProfileState | undefined,
  formData: FormData,
): Promise<ProfileState> {
  try {
    const session = await getVerifiedSession();
    if (!session) return { error: "Faça login para continuar." };

    const stateRaw = orUndefined(formData.get("state"));
    const parsed = profileUpdateSchema.safeParse({
      name: orUndefined(formData.get("name")) ?? "",
      phone: orUndefined(formData.get("phone")),
      // cliente
      city: orUndefined(formData.get("city")),
      state: stateRaw ? stateRaw.toUpperCase() : undefined,
      addressText: orUndefined(formData.get("addressText")),
      // prestador
      displayName: orUndefined(formData.get("displayName")),
      headline: orUndefined(formData.get("headline")),
      bio: orUndefined(formData.get("bio")),
      experienceYears: toNumberOrUndefined(formData.get("experienceYears")),
      certifications: orUndefined(formData.get("certifications")),
      whatsapp: orUndefined(formData.get("whatsapp")),
      cep: orUndefined(formData.get("cep")),
      neighborhood: orUndefined(formData.get("neighborhood")),
      serviceRadiusKm: toNumberOrUndefined(formData.get("serviceRadiusKm")),
      emergency: formData.get("emergency") === "on",
      // ponto fixo
      providerAddress: orUndefined(formData.get("providerAddress")),
      publicLocation: formData.get("publicLocation") === "on",
      lat: toNumberOrUndefined(formData.get("lat")),
      lng: toNumberOrUndefined(formData.get("lng")),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }
    const d = parsed.data;

    const phoneDigits = (d.phone ?? "").replace(/\D/g, "");
    if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 11)) {
      return { error: "Telefone inválido." };
    }

    await db
      .update(users)
      .set({ name: d.name, phone: phoneDigits ? d.phone! : null })
      .where(eq(users.id, session.userId));

    if (session.role === "CUSTOMER") {
      if (d.state && !/^[A-Z]{2}$/.test(d.state)) return { error: "UF inválida (ex: MG)." };
      await db
        .update(customers)
        .set({
          city: d.city ?? null,
          state: d.state ?? null,
          addressText: d.addressText ?? null,
        })
        .where(eq(customers.userId, session.userId));
    }

    let providerSlug: string | null = null;
    if (session.role === "PROVIDER") {
      const [provider] = await db
        .select({ id: providers.id, slug: providers.slug })
        .from(providers)
        .where(eq(providers.userId, session.userId))
        .limit(1);
      if (!provider) return { error: "Perfil de prestador não encontrado." };
      providerSlug = provider.slug;

      if (d.cep && d.cep.replace(/\D/g, "").length !== 8) {
        return { error: "CEP inválido (8 dígitos)." };
      }
      if (d.state && !/^[A-Z]{2}$/.test(d.state)) return { error: "UF inválida (ex: MG)." };
      const whatsappDigits = (d.whatsapp ?? "").replace(/\D/g, "");
      if (whatsappDigits && (whatsappDigits.length < 10 || whatsappDigits.length > 11)) {
        return { error: "WhatsApp inválido." };
      }

      await db
        .update(providers)
        .set({
          displayName: d.displayName ?? d.name,
          headline: d.headline ?? null,
          bio: d.bio ?? null,
          experienceYears: d.experienceYears ?? null,
          certifications: d.certifications ?? null,
          whatsapp: whatsappDigits ? d.whatsapp! : null,
          cep: d.cep ? d.cep.replace(/\D/g, "") : null,
          city: d.city ?? null,
          state: d.state ?? null,
          neighborhood: d.neighborhood ?? null,
          serviceRadiusKm: Math.min(Math.max(d.serviceRadiusKm ?? 15, 1), 200),
          emergency: d.emergency ?? false,
          addressText: d.providerAddress ?? null,
          publicLocation: d.publicLocation ?? false,
          ...(d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : {}),
        })
        .where(eq(providers.id, provider.id));
    }

    await import("@/lib/auth").then((m) => m.setSessionCookie({ userId: session.userId, role: session.role, name: d.name }));
    revalidatePath("/perfil");
    revalidatePath("/perfil/editar");
    if (providerSlug) revalidatePath(`/p/${providerSlug}`);
    return { success: "Perfil atualizado com sucesso!" };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}
