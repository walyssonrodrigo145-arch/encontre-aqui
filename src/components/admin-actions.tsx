"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Ban, Check, Pause, X } from "lucide-react";
import {
  moderateReviewAction,
  setProviderStatusAction,
  setUserStatusAction,
  type AdminState,
} from "@/server/actions/admin";

function useAdminAction() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>();
  const router = useRouter();
  const run = (fn: () => Promise<AdminState>) => {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setFeedback({ error: res.error });
      else {
        setFeedback({ success: res?.success });
        router.refresh();
      }
    });
  };
  return { pending, run, feedback };
}

function Feedback({ feedback }: { feedback?: { error?: string; success?: string } }) {
  if (!feedback) return null;
  if (feedback.error) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs text-[var(--danger)]">
        <AlertCircle size={12} /> {feedback.error}
      </p>
    );
  }
  return <p className="mt-1 text-xs text-emerald-600">{feedback.success}</p>;
}

export function AdminUserActions({
  userId,
  status,
  role,
  userName,
}: {
  userId: number;
  status: string;
  role: string;
  userName: string;
}) {
  const { pending, run, feedback } = useAdminAction();
  if (role === "ADMIN") return <span className="text-xs text-slate-300">—</span>;

  return (
    <div className="inline-flex flex-col items-end">
      <div className="flex justify-end gap-1">
        {status !== "ACTIVE" && (
          <button
            disabled={pending}
            onClick={() => run(() => setUserStatusAction(userId, "ACTIVE"))}
            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
            title="Reativar"
          >
            <Check size={15} />
          </button>
        )}
        {status === "ACTIVE" && (
          <button
            disabled={pending}
            onClick={() => {
              if (confirm(`Suspender a conta de ${userName}? O usuário não poderá entrar até ser reativado.`)) {
                run(() => setUserStatusAction(userId, "SUSPENDED"));
              }
            }}
            className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"
            title="Suspender"
          >
            <Pause size={15} />
          </button>
        )}
        {status !== "BLOCKED" && (
          <button
            disabled={pending}
            onClick={() => {
              if (confirm(`Bloquear definitivamente a conta de ${userName}? Esta ação impede o acesso ao sistema.`)) {
                run(() => setUserStatusAction(userId, "BLOCKED"));
              }
            }}
            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
            title="Bloquear"
          >
            <Ban size={15} />
          </button>
        )}
      </div>
      <Feedback feedback={feedback} />
    </div>
  );
}

export function AdminProviderActions({
  providerId,
  status,
  verificationLevel,
  providerName,
}: {
  providerId: number;
  status: string;
  verificationLevel: string;
  providerName: string;
}) {
  const { pending, run, feedback } = useAdminAction();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col items-end">
      <div className="flex flex-wrap items-center justify-end gap-1">
        {(status === "PENDING" || status === "REJECTED") && (
          <>
            <button
              disabled={pending}
              onClick={() => run(() => setProviderStatusAction(providerId, "APPROVED"))}
              className="btn-primary px-2.5 py-1.5 text-xs"
            >
              <Check size={13} /> Aprovar
            </button>
            <button
              disabled={pending}
              onClick={() => setRejecting((v) => !v)}
              className="btn-outline px-2.5 py-1.5 text-xs text-[var(--danger)]"
            >
              <X size={13} /> Recusar
            </button>
          </>
        )}
        {status === "APPROVED" && (
          <>
            {verificationLevel !== "DOCUMENTS" && (
              <button
                disabled={pending}
                onClick={() => run(() => setProviderStatusAction(providerId, "APPROVED", undefined, true))}
                className="btn-outline px-2.5 py-1.5 text-xs text-blue-700"
                title="Marcar documentação como verificada"
              >
                ✓ Verificar docs
              </button>
            )}
            <button
              disabled={pending}
              onClick={() => {
                if (confirm(`Suspender o perfil de ${providerName}? Ele deixará de aparecer nas buscas.`)) {
                  run(() => setProviderStatusAction(providerId, "SUSPENDED"));
                }
              }}
              className="btn-outline px-2.5 py-1.5 text-xs text-amber-700"
            >
              <Pause size={13} /> Suspender
            </button>
          </>
        )}
        {status === "SUSPENDED" && (
          <button
            disabled={pending}
            onClick={() => run(() => setProviderStatusAction(providerId, "APPROVED"))}
            className="btn-primary px-2.5 py-1.5 text-xs"
          >
            Reativar
          </button>
        )}
        {rejecting && (
          <div className="mt-2 flex w-full gap-2 rounded-xl bg-slate-50 p-2">
            <input
              className="input flex-1 py-1.5 text-sm"
              placeholder="Motivo da recusa"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              disabled={pending}
              onClick={() => {
                run(() => setProviderStatusAction(providerId, "REJECTED", reason));
                setRejecting(false);
              }}
              className="btn-danger px-3 py-1.5 text-xs"
            >
              Confirmar
            </button>
          </div>
        )}
      </div>
      <Feedback feedback={feedback} />
    </div>
  );
}

export function AdminReviewActions({ reviewId, status }: { reviewId: number; status: string }) {
  const { pending, run, feedback } = useAdminAction();
  return (
    <div className="inline-flex flex-col items-end">
      <div className="flex justify-end gap-1">
        {status === "VISIBLE" ? (
          <button
            disabled={pending}
            onClick={() => {
              if (confirm("Remover esta avaliação? Ela deixará de aparecer no perfil do prestador.")) {
                run(() => moderateReviewAction(reviewId, "REMOVE"));
              }
            }}
            className="btn-outline px-2.5 py-1.5 text-xs text-[var(--danger)]"
          >
            Remover
          </button>
        ) : (
          <button
            disabled={pending}
            onClick={() => run(() => moderateReviewAction(reviewId, "RESTORE"))}
            className="btn-outline px-2.5 py-1.5 text-xs"
          >
            Restaurar
          </button>
        )}
      </div>
      <Feedback feedback={feedback} />
    </div>
  );
}
