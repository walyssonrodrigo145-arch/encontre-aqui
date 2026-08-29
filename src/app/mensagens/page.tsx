import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { appointments, conversations, customers, providers, users } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import { Navbar, Footer } from "@/components/navbar";
import { Avatar, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mensagens" };

export default async function MensagensPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, sp] = await Promise.all([getVerifiedSession(), searchParams]);
  if (!session) redirect("/entrar");

  // ADMIN não participa de conversas — mostra estado vazio em vez de quebrar
  if (session.role === "ADMIN") {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          <h1 className="mb-5 text-2xl font-extrabold text-slate-900">Mensagens</h1>
          <EmptyState
            icon={<MessageCircle size={20} />}
            title="Chat exclusivo para clientes e profissionais"
            description="O chat conecta clientes a prestadores de serviço. Use o painel administrativo para gerenciar a plataforma."
          />
        </main>
        <Footer />
      </div>
    );
  }

  // "Conversar" vindo de um agendamento — abre (ou cria) a conversa correta
  const agendamentoId = Number(sp.agendamento);
  if (Number.isFinite(agendamentoId) && agendamentoId > 0) {
    const convId = await resolveConversationFromAppointment(session.userId, session.role, agendamentoId);
    if (convId) redirect(`/mensagens/${convId}`);
    redirect("/mensagens");
  }

  let conversationId: number | undefined;

  if (session.role === "CUSTOMER") {
    const targetProviderId = Number(sp.prestador);
    const [customer] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
    if (!customer) redirect("/app");
    if (Number.isFinite(targetProviderId) && targetProviderId > 0) {
      // só cria conversa se o prestador existe e está aprovado
      const [provider] = await db
        .select({ id: providers.id })
        .from(providers)
        .where(and(eq(providers.id, targetProviderId), eq(providers.status, "APPROVED")))
        .limit(1);
      if (provider) {
        const existing = await db
          .select()
          .from(conversations)
          .where(and(eq(conversations.customerId, customer.id), eq(conversations.providerId, provider.id)))
          .limit(1);
        let conv = existing[0];
        if (!conv) {
          [conv] = await db
            .insert(conversations)
            .values({ customerId: customer.id, providerId: provider.id })
            .returning();
        }
        conversationId = conv!.id;
      }
    }
  }

  // lista de conversas
  const myConversations =
    session.role === "CUSTOMER"
      ? await db
          .select({
            id: conversations.id,
            lastMessageAt: conversations.lastMessageAt,
            otherName: providers.displayName,
          })
          .from(conversations)
          .innerJoin(providers, eq(conversations.providerId, providers.id))
          .where(
            eq(
              conversations.customerId,
              (
                await db
                  .select({ id: customers.id })
                  .from(customers)
                  .where(eq(customers.userId, session.userId))
                  .limit(1)
              )[0]!.id,
            ),
          )
          .orderBy(desc(conversations.lastMessageAt))
      : await db
          .select({
            id: conversations.id,
            lastMessageAt: conversations.lastMessageAt,
            otherName: users.name,
          })
          .from(conversations)
          .innerJoin(customers, eq(conversations.customerId, customers.id))
          .innerJoin(users, eq(customers.userId, users.id))
          .where(
            eq(
              conversations.providerId,
              (
                await db
                  .select({ id: providers.id })
                  .from(providers)
                  .where(eq(providers.userId, session.userId))
                  .limit(1)
              )[0]!.id,
            ),
          )
          .orderBy(desc(conversations.lastMessageAt));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="mb-5 text-2xl font-extrabold text-slate-900">Mensagens</h1>
        {myConversations.length === 0 ? (
          <EmptyState
            icon={<MessageCircle size={20} />}
            title="Nenhuma conversa ainda"
            description="Entre no perfil de um profissional e clique em 'Mensagem' para iniciar uma conversa."
            action={<Link href="/busca" className="btn-primary">Buscar profissionais</Link>}
          />
        ) : (
          <ul className="space-y-2">
            {myConversations.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/mensagens/${c.id}`}
                  className={`card flex items-center gap-3 p-4 transition hover:shadow-md ${
                    conversationId === c.id ? "border-[var(--primary)]" : ""
                  }`}
                >
                  <Avatar name={c.otherName} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-700">{c.otherName}</p>
                    <p className="text-xs text-slate-400">Última atividade {timeAgo(c.lastMessageAt)}</p>
                  </div>
                  <span className="text-slate-300">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}

/** Localiza (ou cria) a conversa entre as partes de um agendamento, validando pertencimento. */
async function resolveConversationFromAppointment(
  userId: number,
  role: "CUSTOMER" | "PROVIDER",
  appointmentId: number,
): Promise<number | null> {
  const [appt] = await db
    .select({ customerId: appointments.customerId, providerId: appointments.providerId })
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!appt) return null;

  if (role === "CUSTOMER") {
    const [customer] = await db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.userId, userId))
      .limit(1);
    if (!customer || customer.id !== appt.customerId) return null;
  } else {
    const [provider] = await db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.userId, userId))
      .limit(1);
    if (!provider || provider.id !== appt.providerId) return null;
  }

  const [existing] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.customerId, appt.customerId), eq(conversations.providerId, appt.providerId)))
    .limit(1);
  if (existing) return existing.id;

  const [conv] = await db
    .insert(conversations)
    .values({ customerId: appt.customerId, providerId: appt.providerId })
    .returning();
  return conv!.id;
}
