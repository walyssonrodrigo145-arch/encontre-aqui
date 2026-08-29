import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth-shell";
import { getVerifiedSession } from "@/lib/auth";

export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  const session = await getVerifiedSession();
  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : session.role === "PROVIDER" ? "/prestador/painel" : "/app");
  }
  return (
    <AuthShell>
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </AuthShell>
  );
}
