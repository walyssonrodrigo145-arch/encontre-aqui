"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { providerStats, providers } from "@/lib/schema";
import { rateLimit } from "@/server/rate-limit";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function bumpCounter(providerId: number, field: "profileViews" | "contactClicks", limitKey: string) {
  const [p] = await db
    .select({ id: providers.id })
    .from(providers)
    .where(eq(providers.id, providerId))
    .limit(1);
  if (!p) return;
  if (!rateLimit(limitKey, 300, 60 * 60 * 1000)) return; // trava contra inflação artificial

  const date = todayStr();
  const [existing] = await db
    .select({ id: providerStats.id, profileViews: providerStats.profileViews, contactClicks: providerStats.contactClicks })
    .from(providerStats)
    .where(and(eq(providerStats.providerId, providerId), eq(providerStats.date, date)))
    .limit(1);

  if (existing) {
    await db
      .update(providerStats)
      .set(
        field === "profileViews"
          ? { profileViews: existing.profileViews + 1 }
          : { contactClicks: existing.contactClicks + 1 },
      )
      .where(eq(providerStats.id, existing.id));
  } else {
    await db.insert(providerStats).values({
      providerId,
      date,
      profileViews: field === "profileViews" ? 1 : 0,
      contactClicks: field === "contactClicks" ? 1 : 0,
    });
  }
}

export async function trackProfileViewAction(providerId: number) {
  await bumpCounter(providerId, "profileViews", `view:${providerId}`).catch(() => {});
}

export async function trackContactClickAction(providerId: number) {
  await bumpCounter(providerId, "contactClicks", `contact:${providerId}`).catch(() => {});
}
