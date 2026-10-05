import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";

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

/**
 * Criptografia reversível (AES-256-GCM) para documentos que precisam ser
 * recuperados pelo gateway de pagamento (ex: criação de customer no Asaas).
 * Formato: enc:<iv>:<tag>:<data> (tudo em hex).
 */
function docCipherKey(): Buffer {
  let key = process.env.AUTH_SECRET;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET é obrigatório em produção.");
    }
    key = "dev-secret-change-me-in-production-0123456789";
  }
  // chave derivada distinta da usada para JWT (evita compartilhar material de chave)
  return createHash("sha256").update(`${key}:doc-encryption:v1`).digest();
}

export function encryptDocument(document: string): string {
  const digits = document.replace(/\D/g, "");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", docCipherKey(), iv);
  const data = Buffer.concat([cipher.update(digits, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString("hex")}:${tag.toString("hex")}:${data.toString("hex")}`;
}

export function decryptDocument(stored: string | null | undefined): string | null {
  if (!stored || !stored.startsWith("enc:")) return null; // legado (hmac:) é irreversível
  try {
    const [, ivHex, tagHex, dataHex] = stored.split(":");
    const decipher = createDecipheriv("aes-256-gcm", docCipherKey(), Buffer.from(ivHex!, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex!, "hex"));
    const data = Buffer.concat([decipher.update(Buffer.from(dataHex!, "hex")), decipher.final()]);
    return data.toString("utf8");
  } catch {
    return null;
  }
}
