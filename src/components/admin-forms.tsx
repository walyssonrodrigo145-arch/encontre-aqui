"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toggleCategoryAction, upsertPlanAction, type AdminState } from "@/server/actions/admin";

export function ToggleCategory({ categoryId, isActive }: { categoryId: number; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleCategoryAction(categoryId, !isActive);
          router.refresh();
        })
      }
      className={`badge ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}
    >
      {isActive ? "Ativa" : "Inativa"}
    </button>
  );
}

export function PlanForm({
  plan,
}: {
  plan?: { id: number; name: string; priceCents: number; description: string | null; maxPhotos: number; maxPortfolio: number; searchBoost: number };
}) {
  const [state, action, pending] = useActionState<AdminState | undefined, FormData>(upsertPlanAction, undefined);
  return (
    <form action={action} className="card space-y-3 p-4">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      {state?.error && (
        <p className="flex items-center gap-2 text-xs text-[var(--danger)]">
          <AlertCircle size={13} /> {state.error}
        </p>
      )}
      {state?.success && (
        <p className="flex items-center gap-2 text-xs text-emerald-600">
          <CheckCircle2 size={13} /> {state.success}
        </p>
      )}
      <div>
        <label className="label">Nome</label>
        <input name="name" required defaultValue={plan?.name} className="input" placeholder="Ex: Básico" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Preço mensal (R$)</label>
          <input name="price" required defaultValue={plan ? (plan.priceCents / 100).toString() : ""} className="input" placeholder="29,90" />
        </div>
        <div>
          <label className="label">Boost nas buscas (0-0.3)</label>
          <input name="searchBoost" defaultValue={plan?.searchBoost.toString() ?? "0"} className="input" placeholder="0.1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Máx. fotos</label>
          <input name="maxPhotos" type="number" min={1} defaultValue={plan?.maxPhotos ?? 3} className="input" />
        </div>
        <div>
          <label className="label">Máx. portfólio</label>
          <input name="maxPortfolio" type="number" min={1} defaultValue={plan?.maxPortfolio ?? 10} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Descrição</label>
        <input name="description" defaultValue={plan?.description ?? ""} className="input" />
      </div>
      <button disabled={pending} className="btn-primary w-full py-2 text-sm">
        {pending ? "Salvando..." : plan ? "Atualizar plano" : "Criar plano"}
      </button>
    </form>
  );
}
