import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { getVerifiedSession } from "@/lib/auth";

export const metadata = { title: "Criar conta" };
export const dynamic = "force-dynamic";

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, sp] = await Promise.all([getVerifiedSession(), searchParams]);
  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : session.role === "PROVIDER" ? "/prestador/painel" : "/app");
  }
  const defaultRole = sp.role === "PROVIDER" ? "PROVIDER" : "CUSTOMER";
  return (
    <AuthShell>
      <div className="w-full max-w-xl">
        <RegisterForm defaultRole={defaultRole} />
      </div>
    </AuthShell>
  );
}
