"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Flag, Send } from "lucide-react";
import { replyReviewAction, reportReviewAction } from "@/server/actions/reviews";

export function ProviderReplyForm({ reviewId }: { reviewId: number }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (done) {
    return <p className="mt-2 text-xs text-emerald-600">Resposta publicada.</p>;
  }

  return (
    <div className="mt-2">
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-ghost py-1.5 text-xs">
          Responder avaliação
        </button>
      ) : (
        <div className="rounded-xl bg-slate-50 p-3">
          <textarea
            rows={2}
            maxLength={500}
            className="input resize-none"
            placeholder="Responda publicamente este cliente..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          {error && (
            <p className="mt-1 flex items-center gap-1 text-xs text-[var(--danger)]">
              <AlertCircle size={12} /> {error}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button
              disabled={pending || reply.trim().length === 0}
              className="btn-primary py-1.5 text-xs"
              onClick={() =>
                startTransition(async () => {
                  const res = await replyReviewAction(reviewId, reply.trim());
                  if (res?.error) setError(res.error);
                  else {
                    setDone(true);
                    router.refresh();
                  }
                })
              }
            >
              <Send size={13} /> {pending ? "Enviando..." : "Publicar resposta"}
            </button>
            <button onClick={() => setOpen(false)} className="btn-ghost py-1.5 text-xs">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const REPORT_REASONS = [
  "Conteúdo ofensivo ou abusivo",
  "Informação falsa ou enganosa",
  "Spam ou publicidade",
  "Não corresponde a um serviço real",
  "Outro motivo",
];

export function ReportReviewButton({ reviewId }: { reviewId: number }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState<string>();

  if (reported) {
    return <span className="text-xs text-slate-400">Denúncia enviada para análise.</span>;
  }

  if (!open) {
    return (
      <button
        className="text-xs font-medium text-slate-400 transition hover:text-[var(--danger)]"
        onClick={() => setOpen(true)}
      >
        <Flag size={11} className="mr-0.5 inline" />
        Denunciar
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl bg-slate-50 p-2.5">
      {REPORT_REASONS.map((reason) => (
        <button
          key={reason}
          disabled={pending}
          className="min-h-[32px] rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-50"
          onClick={() =>
            startTransition(async () => {
              const res = await reportReviewAction(reviewId, reason);
              if (res?.error) setError(res.error);
              else {
                setError(undefined);
                setReported(true);
              }
            })
          }
        >
          {pending ? "Enviando..." : reason}
        </button>
      ))}
      {error && (
        <p className="flex w-full items-center gap-1 text-xs text-[var(--danger)]">
          <AlertCircle size={12} /> {error}
        </p>
      )}
      <button onClick={() => setOpen(false)} className="btn-ghost py-1 text-[11px]">
        Voltar
      </button>
    </div>
  );
}
