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

export function ReportReviewButton({ reviewId }: { reviewId: number }) {
  const [pending, startTransition] = useTransition();
  const [reported, setReported] = useState(false);

  if (reported) {
    return <span className="text-xs text-slate-400">Denúncia enviada para análise.</span>;
  }

  return (
    <button
      disabled={pending}
      className="text-xs font-medium text-slate-400 transition hover:text-[var(--danger)]"
      onClick={() => {
        const reason = prompt("Descreva o motivo da denúncia desta avaliação:");
        if (!reason || !reason.trim()) return;
        startTransition(async () => {
          await reportReviewAction(reviewId, reason.trim());
          setReported(true);
        });
      }}
    >
      <Flag size={11} className="mr-0.5 inline" />
      {pending ? "Enviando..." : "Denunciar"}
    </button>
  );
}
