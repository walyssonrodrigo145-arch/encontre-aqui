"use client";

import { useEffect } from "react";

export default function ClientAreaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error.message);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          ⚠️
        </span>
        <h1 className="font-display mt-4 text-lg font-extrabold text-slate-900">
          Não foi possível carregar esta página
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Ocorreu um erro ao processar sua solicitação. Tente novamente em alguns instantes.
        </p>
        <button onClick={reset} className="btn-primary mt-6 w-full">
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
