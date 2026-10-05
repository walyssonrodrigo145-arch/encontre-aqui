"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Ban, Check, CheckCircle2, Pause, X } from "lucide-react";
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
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
      <CheckCircle2 size={12} /> {feedback.success}
    </p>
  );
}

/** Modal de confirmação no padrão do sistema (substitui window.confirm). */
function ConfirmModal({
  title,
  description,
  confirmLabel,
  danger,
  pending,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="max-h-[85vh] w-[95vw] max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              danger ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
            }`}
          >
            {danger ? <Ban size={22} /> : <Pause size={22} />}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <h3 className="font-display mt-3 text-lg font-extrabold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
        <div className="mt-5 flex gap-2">
          <button
            disabled={pending}
            onClick={onConfirm}
            className={danger ? "btn-danger flex-1" : "btn-primary flex-1"}
          >
            {pending ? "Processando..." : confirmLabel}
          </button>
          <button onClick={onClose} className="btn-outline px-4">
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hook de confirmação com modal no padrão. */
function useConfirm() {
  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const ask = (cfg: { title: string; description: string; confirmLabel: string; danger?: boolean; onConfirm: () => void }) =>
    setConfirmState(cfg);
  const close = () => setConfirmState(null);

  const modal = confirmState ? (
    <ConfirmModal
      title={confirmState.title}
      description={confirmState.description}
      confirmLabel={confirmState.confirmLabel}
      danger={confirmState.danger}
      pending={false}
      onConfirm={() => {
        confirmState.onConfirm();
        close();
      }}
      onClose={close}
    />
  ) : null;

  return { ask, modal };
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
  const { ask, modal } = useConfirm();
  if (role === "ADMIN") return <span className="text-xs text-slate-300">—</span>;

  return (
    <div className="inline-flex flex-col items-end">
      <div className="flex justify-end gap-1">
        {status !== "ACTIVE" && (
          <button
            disabled={pending}
            onClick={() => run(() => setUserStatusAction(userId, "ACTIVE"))}
            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
            title="Reativar"
          >
            <Check size={15} />
          </button>
        )}
        {status === "ACTIVE" && (
          <button
            disabled={pending}
            onClick={() =>
              ask({
                title: "Suspender conta?",
                description: `${userName} não poderá entrar no sistema até ser reativado.`,
                confirmLabel: "Suspender",
                onConfirm: () => run(() => setUserStatusAction(userId, "SUSPENDED")),
              })
            }
            className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
            title="Suspender"
          >
            <Pause size={15} />
          </button>
        )}
        {status !== "BLOCKED" && (
          <button
            disabled={pending}
            onClick={() =>
              ask({
                title: "Bloquear conta?",
                description: `Bloqueio definitivo de ${userName}. Esta ação impede o acesso ao sistema.`,
                confirmLabel: "Bloquear",
                danger: true,
                onConfirm: () => run(() => setUserStatusAction(userId, "BLOCKED")),
              })
            }
            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
            title="Bloquear"
          >
            <Ban size={15} />
          </button>
        )}
      </div>
      <Feedback feedback={feedback} />
      {modal}
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
  const { ask, modal } = useConfirm();
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
                <Check size={13} /> Verificar docs
              </button>
            )}
            <button
              disabled={pending}
              onClick={() =>
                ask({
                  title: "Suspender perfil?",
                  description: `${providerName} deixará de aparecer nas buscas e terá as ações do painel bloqueadas.`,
                  confirmLabel: "Suspender",
                  onConfirm: () => run(() => setProviderStatusAction(providerId, "SUSPENDED")),
                })
              }
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
      {modal}
    </div>
  );
}

export function AdminReviewActions({ reviewId, status }: { reviewId: number; status: string }) {
  const { pending, run, feedback } = useAdminAction();
  const { ask, modal } = useConfirm();

  return (
    <div className="inline-flex flex-col items-end">
      <div className="flex justify-end gap-1">
        {status === "VISIBLE" ? (
          <button
            disabled={pending}
            onClick={() =>
              ask({
                title: "Remover avaliação?",
                description: "Ela deixará de aparecer no perfil do prestador e poderá ser restaurada depois.",
                confirmLabel: "Remover",
                danger: true,
                onConfirm: () => run(() => moderateReviewAction(reviewId, "REMOVE")),
              })
            }
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
      {modal}
    </div>
  );
}
