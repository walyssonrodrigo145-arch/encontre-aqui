"use server";

import { friendlyError } from "@/server/errors";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  adminLogs,
  providers,
  reports,
  reviews,
  subscriptionPlans,
  users,
} from "@/lib/schema";
import { requireRole } from "@/lib/auth";

export interface AdminState {
  error?: string;
  success?: string;
}

async function audit(action: string, targetType?: string, targetId?: number, metadata?: string) {
  const session = await requireRole("ADMIN");
  await db.insert(adminLogs).values({
    adminId: session.userId,
    action,
    targetType,
    targetId,
    metadata,
  });
}

export async function setUserStatusAction(userId: number, status: "ACTIVE" | "SUSPENDED" | "BLOCKED"): Promise<AdminState> {
  try {
    const session = await requireRole("ADMIN");
    if (userId === session.userId) {
      return { error: "Você não pode alterar o status da sua própria conta." };
    }
    const [u] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
    if (!u) return { error: "Usuário não encontrado." };
    if (u.role === "ADMIN") return { error: "Contas administradoras não podem ser alteradas por aqui." };
    await db.update(users).set({ status }).where(eq(users.id, userId));
    await audit(`user_${status.toLowerCase()}`, "USER", userId);
    revalidatePath("/admin/usuarios");
    return { success: `Usuário ${status === "ACTIVE" ? "reativado" : status === "SUSPENDED" ? "suspenso" : "bloqueado"}.` };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function setProviderStatusAction(
  providerId: number,
  status: "APPROVED" | "SUSPENDED" | "REJECTED" | "PENDING",
  reason?: string,
  verifyDocs?: boolean,
): Promise<AdminState> {
  try {
    await requireRole("ADMIN");
    await db
      .update(providers)
      .set({
        status,
        rejectionReason: status === "REJECTED" ? reason ?? "Não atende aos requisitos" : null,
        ...(verifyDocs ? { verificationLevel: "DOCUMENTS" as const } : {}),
      })
      .where(eq(providers.id, providerId));
    await audit(`provider_${status.toLowerCase()}`, "PROVIDER", providerId, reason);
    revalidatePath("/admin/prestadores");
    return { success: "Status atualizado." };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function moderateReviewAction(
  reviewId: number,
  action: "REMOVE" | "RESTORE" | "RESOLVE_REPORT",
): Promise<AdminState> {
  try {
    await requireRole("ADMIN");
    if (action === "REMOVE") {
      await db.update(reviews).set({ status: "REMOVED" }).where(eq(reviews.id, reviewId));
    } else if (action === "RESTORE") {
      await db.update(reviews).set({ status: "VISIBLE" }).where(eq(reviews.id, reviewId));
    } else {
      await db.update(reports).set({ status: "RESOLVED" }).where(eq(reports.targetId, reviewId));
    }
    await audit(`review_${action.toLowerCase()}`, "REVIEW", reviewId);
    revalidatePath("/admin/avaliacoes");
    return { success: "Avaliação moderada." };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function upsertPlanAction(
  _prev: AdminState | undefined,
  formData: FormData,
): Promise<AdminState> {
  try {
    await requireRole("ADMIN");
    const id = Number(formData.get("id")) || undefined;
    const name = String(formData.get("name") ?? "").trim();
    const priceRaw = Number(String(formData.get("price") ?? "0").replace(",", "."));
    const priceCents = Number.isFinite(priceRaw) ? Math.round(priceRaw * 100) : 0;
    if (name.length < 3 || priceCents <= 0) return { error: "Dados do plano inválidos." };

    const toInt = (v: FormDataEntryValue | null, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
    };
    const boostRaw = Number(String(formData.get("searchBoost") ?? "0").replace(",", "."));

    const values = {
      name,
      priceCents,
      description: String(formData.get("description") ?? "").trim() || null,
      maxPhotos: toInt(formData.get("maxPhotos"), 3),
      maxPortfolio: toInt(formData.get("maxPortfolio"), 10),
      searchBoost: Number.isFinite(boostRaw) ? Math.min(Math.max(boostRaw, 0), 0.3) : 0,
    };

    if (id) {
      await db.update(subscriptionPlans).set(values).where(eq(subscriptionPlans.id, id));
    } else {
      await db.insert(subscriptionPlans).values({
        ...values,
        slug: name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-"),
      });
    }
    await audit(id ? "plan_update" : "plan_create", "PLAN", id);
    revalidatePath("/admin/planos");
    return { success: "Plano salvo." };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function togglePlanAction(planId: number, isActive: boolean): Promise<AdminState> {
  try {
    await requireRole("ADMIN");
    await db
      .update(subscriptionPlans)
      .set({ isActive })
      .where(eq(subscriptionPlans.id, planId));
    await audit(isActive ? "plan_activate" : "plan_deactivate", "PLAN", planId);
    revalidatePath("/admin/planos");
    return { success: isActive ? "Plano ativado." : "Plano desativado." };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}

export async function toggleCategoryAction(categoryId: number, isActive: boolean): Promise<AdminState> {
  try {
    await requireRole("ADMIN");
    const { categories } = await import("@/lib/schema");
    await db.update(categories).set({ isActive }).where(eq(categories.id, categoryId));
    await audit("category_toggle", "CATEGORY", categoryId);
    revalidatePath("/admin/categorias");
    return { success: "Categoria atualizada." };
  } catch (e) {
    return { error: friendlyError(e) };
  }
}
