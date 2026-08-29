"use client";

import { trackContactClickAction } from "@/server/actions/tracking";

/** Link de WhatsApp que registra o clique no contato antes de abrir. */
export function WhatsAppContactLink({
  providerId,
  phoneDigits,
  children,
  className,
}: {
  providerId: number;
  phoneDigits: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={`https://wa.me/55${phoneDigits}`}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={() => {
        void trackContactClickAction(providerId);
      }}
    >
      {children}
    </a>
  );
}
