import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { conversations, customers, messages, providers, users } from "@/lib/schema";
import { getVerifiedSession } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { Navbar, Footer, MobileTabBar, TabBarSpacer } from "@/components/navbar";
import { Avatar } from "@/components/ui";
import { ChatInput } from "@/components/chat-input";

export const metadata = { title: "Conversa" };

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const conversationId = Number(id);
  if (!Number.isFinite(conversationId)) notFound();

  const session = await getVerifiedSession();
  if (!session) redirect("/entrar");

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conv) notFound();

  // autorização + nome do outro participante
  let otherName = "";
  let authorized = false;
  if (session.role === "CUSTOMER") {
    const [c] = await db.select().from(customers).where(eq(customers.userId, session.userId)).limit(1);
    if (c && c.id === conv.customerId) {
      authorized = true;
      const [p] = await db
        .select({ name: providers.displayName })
        .from(providers)
        .where(eq(providers.id, conv.providerId))
        .limit(1);
      otherName = p?.name ?? "Profissional";
    }
  } else if (session.role === "PROVIDER") {
    const [p] = await db.select().from(providers).where(eq(providers.userId, session.userId)).limit(1);
    if (p && p.id === conv.providerId) {
      authorized = true;
      const [c] = await db
        .select({ name: users.name })
        .from(customers)
        .innerJoin(users, eq(customers.userId, users.id))
        .where(eq(customers.id, conv.customerId))
        .limit(1);
      otherName = c?.name ?? "Cliente";
    }
  }
  if (!authorized) notFound();

  const msgs = await db
    .select({
      id: messages.id,
      content: messages.content,
      senderId: messages.senderId,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        <div className="card mb-3 flex items-center gap-3 p-3">
          <Link href="/mensagens" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100">
            <ArrowLeft size={18} />
          </Link>
          <div className="relative">
            <Avatar name={otherName} size={40} />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[var(--success)] ring-2 ring-white" />
          </div>
          <div>
            <p className="font-display text-sm font-bold text-slate-800">{otherName}</p>
            <p className="flex items-center gap-1 text-xs text-[var(--success)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse-dot" /> Online
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-2 py-3">
          {msgs.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-400">
              Nenhuma mensagem ainda. Diga olá! 👋
            </p>
          )}
          {msgs.map((m, idx) => {
            const mine = m.senderId === session.userId;
            const showDate =
              idx === 0 ||
              msgs[idx - 1]!.createdAt.toDateString() !== m.createdAt.toDateString();
            return (
              <div key={m.id}>
                {showDate && (
                  <p className="my-3 text-center text-[11px] font-medium text-slate-400">
                    {formatDate(m.createdAt, false)}
                  </p>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[75%] ${
                      mine
                        ? "rounded-2xl rounded-br-md bg-[var(--primary)] text-white shadow-[var(--primary)]/20"
                        : "rounded-2xl rounded-bl-md border border-[var(--border)] bg-white text-slate-700"
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.content}</p>
                    <p className={`mt-1 text-right text-[10px] ${mine ? "text-white/60" : "text-slate-400"}`}>
                      {m.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-16 border-t border-[var(--border)] bg-white pt-3 md:bottom-0">
          <ChatInput conversationId={conversationId} />
        </div>
      </main>
      <Footer />
      <TabBarSpacer />
      <MobileTabBar />
    </div>
  );
}
