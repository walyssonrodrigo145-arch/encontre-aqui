"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 text-4xl">😵</span>
      <h1 className="text-2xl font-extrabold text-slate-900">Algo deu errado</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Encontramos um erro inesperado. Tente novamente em alguns instantes.
      </p>
      <div className="mt-6 flex gap-2">
        <button onClick={reset} className="btn-primary">
          Tentar novamente
        </button>
        <Link href="/" className="btn-outline">
          Início
        </Link>
      </div>
      {process.env.NODE_ENV === "development" && (
        <p className="mt-4 max-w-md rounded-xl bg-slate-100 p-3 text-left text-xs text-slate-500">
          {error.message}
        </p>
      )}
    </div>
  );
}
