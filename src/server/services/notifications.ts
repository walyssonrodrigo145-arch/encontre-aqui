import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";

interface NotifyInput {
  userId: number;
  type: string;
  title: string;
  body?: string;
  link?: string;
  referenceType?: string;
  referenceId?: number;
}

export async function notify(input: NotifyInput) {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    channel: "INAPP",
  });
  // Futuro: dispatch para email/whatsapp/push conforme preferências do usuário
}
