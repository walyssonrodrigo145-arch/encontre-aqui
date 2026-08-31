"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";

export async function unreadCountAction(): Promise<number> {
  const session = await getVerifiedSession();
  if (!session) return 0;
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, session.userId), isNull(notifications.readAt)));
  return rows.length;
}

export async function markAllReadAction() {
  const session = await getVerifiedSession();
  if (!session) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, session.userId), isNull(notifications.readAt)));
  revalidatePath("/notificacoes");
}

export async function markReadAction(notificationId: number) {
  const session = await getVerifiedSession();
  if (!session) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, session.userId)));
  revalidatePath("/notificacoes");
}
