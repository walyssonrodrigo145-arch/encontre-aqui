"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { sendMessageAction, type ChatState } from "@/server/actions/chat";

export function ChatInput({ conversationId }: { conversationId: number }) {
  const [state, action, pending] = useActionState<ChatState | undefined, FormData>(sendMessageAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.conversationId) formRef.current?.reset();
  }, [state]);

  return (
    <div className="pb-2">
      <form ref={formRef} action={action} className="flex gap-2">
        <input type="hidden" name="conversationId" value={conversationId} />
        <input
          name="content"
          required
          maxLength={2000}
          placeholder="Escreva sua mensagem..."
          className="input flex-1"
          autoComplete="off"
        />
        <button disabled={pending} className="btn-primary shrink-0 px-3" title="Enviar">
          <Send size={17} />
        </button>
      </form>
      {state?.error && (
        <p className="mt-1.5 text-xs text-[var(--danger)]">{state.error}</p>
      )}
    </div>
  );
}
