import { createHmac } from "crypto";

/**
 * Hash determinístico (HMAC-SHA256) para CPF/CNPJ.
 * - Permite verificação de unicidade sem armazenar o documento em texto puro.
 * - Nunca é reversível — atende ao princípio de minimização da LGPD.
 */
export function hashDocument(document: string): string {
  const digits = document.replace(/\D/g, "");
  let key = process.env.AUTH_SECRET;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET é obrigatório em produção.");
    }
    key = "dev-secret-change-me-in-production-0123456789";
  }
  const mac = createHmac("sha256", key).update(digits).digest("hex");
  return `hmac:${mac}`;
}
