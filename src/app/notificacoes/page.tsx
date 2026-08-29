import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { BellOff } from "lucide-react";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { Navbar, Footer } from "@/components/navbar";
import { EmptyState } from "@/components/ui";
import { NotificationCard } from "@/components/notification-card";
import { markAllReadAction } from "@/server/actions/notifications";

export const dynamic = "force-dynamic";

export const metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  const session = await getVerifiedSession();
  if (!session) redirect("/entrar");

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session!.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const unread = rows.filter((r) => !r.readAt).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-slate-900">Notificações</h1>
          {unread > 0 && (
            <form action={markAllReadAction}>
              <button className="btn-ghost text-sm">Marcar todas como lidas ({unread})</button>
            </form>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<BellOff size={20} />}
            title="Nenhuma notificação"
            description="Você será avisado aqui sobre orçamentos, agendamentos e avaliações."
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((n) => (
              <li key={n.id}>
                <NotificationCard notification={n} />
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
