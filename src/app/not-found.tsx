import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <SearchX size={28} />
      </span>
      <h1 className="text-2xl font-extrabold text-slate-900">Página não encontrada</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        O conteúdo que você procura não existe ou foi removido.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Voltar ao início
      </Link>
    </div>
  );
}
