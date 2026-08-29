import { createHmac } from "crypto";

/**
 * Hash determinístico (HMAC-SHA256) para CPF/CNPJ.
 * - Permite verificação de unicidade sem armazenar o documento em texto puro.
 * - Nunca é reversível — atende ao princípio de minimização da LGPD.
 */
export function hashDocument(document: string): string {
  const digits = document.replace(/\D/g, "");
  const key = process.env.AUTH_SECRET ?? "dev-secret-change-me-in-production-0123456789";
  const mac = createHmac("sha256", key).update(digits).digest("hex");
  return `hmac:${mac}`;
}
