"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { customers, favorites, providers } from "@/lib/schema";
import { requireRole } from "@/lib/auth";

export async function isFavoriteAction(providerId: number): Promise<boolean> {
  const session = await requireRole("CUSTOMER").catch(() => null);
  if (!session) return false;
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.userId))
    .limit(1);
  if (!customer) return false;
  const [fav] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.customerId, customer.id), eq(favorites.providerId, providerId)))
    .limit(1);
  return !!fav;
}

export async function toggleFavoriteAction(providerId: number) {
  const session = await requireRole("CUSTOMER");
  const [customer] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.userId, session.userId))
    .limit(1);
  if (!customer) return;

  // só permite favoritar prestadores aprovados (evita FK error / lixo no banco)
  const [provider] = await db
    .select({ id: providers.id })
    .from(providers)
    .where(and(eq(providers.id, providerId), eq(providers.status, "APPROVED")))
    .limit(1);
  if (!provider) return;

  const [existing] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.customerId, customer.id), eq(favorites.providerId, providerId)))
    .limit(1);

  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
  } else {
    await db.insert(favorites).values({ customerId: customer.id, providerId });
  }
  revalidatePath("/app/favoritos");
}
