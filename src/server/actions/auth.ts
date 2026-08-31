"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { customers, providers, users } from "@/lib/schema";
import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validations";
import { isValidCNPJ, isValidCPF, slugify } from "@/lib/utils";
import { hashDocument } from "@/lib/crypto";
import { rateLimit } from "@/server/rate-limit";

export interface ActionState {
  error?: string;
  success?: string;
}


/** IP do chamador (proxy-aware) para dimensão de rate limit. */
async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "unknown").split(",")[0]!.trim();
}
export async function registerAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: formData.get("role") ?? "CUSTOMER",
    personType: formData.get("personType") ?? "PF",
    document: formData.get("document") ?? "",
    lgpdConsent: formData.get("lgpdConsent") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { name, email, phone, password, role, personType, document } = parsed.data;

  // anti-spam: por e-mail E por IP (impossibilita spraying com lista de e-mails)
  const ip = await clientIp();
  if (!rateLimit(`register:${email}`, 5, 60_000) || !rateLimit(`register-ip:${ip}`, 20, 3_600_000)) {
    return { error: "Muitas tentativas. Aguarde um minuto." };
  }

  // valida algoritmo do documento
  const docValid =
    personType === "PF" ? isValidCPF(document) : isValidCNPJ(document);
  if (!docValid) {
    return {
      error:
        personType === "PF"
          ? "CPF inválido. Verifique os números digitados."
          : "CNPJ inválido. Verifique os números digitados.",
    };
  }
  const docHash = hashDocument(document);

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingEmail) return { error: "Este e-mail já está cadastrado." };

  const [existingDoc] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.documentEncrypted, docHash))
    .limit(1);
  if (existingDoc) {
    return {
      error:
        personType === "PF"
          ? "Este CPF já está cadastrado."
          : "Este CNPJ já está cadastrado.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const [user] = await db
      .insert(users)
      .values({
        role,
        name,
        email,
        phone,
        passwordHash,
        documentEncrypted: docHash,
        lgpdConsentAt: new Date(),
      })
      .returning();

    if (role === "PROVIDER") {
      await db.insert(providers).values({
        userId: user!.id,
        displayName: name,
        slug: `${slugify(name)}-${user!.id}`,
        whatsapp: phone,
        status: "DRAFT",
      });
      await setSessionCookie({ userId: user!.id, role, name });
      redirect("/prestador/cadastro");
    }

    await db.insert(customers).values({ userId: user!.id });
    await setSessionCookie({ userId: user!.id, role, name });
    redirect("/app?welcome=1");
  } catch (e) {
    // corrida: outro cadastro criou o mesmo e-mail/documento entre o SELECT e o INSERT
    if (
      e instanceof Error &&
      (e.message.includes("UNIQUE") || e.message.includes("unique"))
    ) {
      const [dupEmail] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      return {
        error: dupEmail
          ? "Este e-mail já está cadastrado."
          : personType === "PF"
            ? "Este CPF já está cadastrado."
            : "Este CNPJ já está cadastrado.",
      };
    }
    throw e;
  }
}

export async function loginAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  // anti-bruteforce: por e-mail E por IP
  const ip = await clientIp();
  if (
    !rateLimit(`login:${parsed.data.email}`, 8, 60_000) ||
    !rateLimit(`login-ip:${ip}`, 30, 60_000)
  ) {
    return { error: "Muitas tentativas. Aguarde um minuto." };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos." };
  }
  if (user.status === "BLOCKED") return { error: "Conta bloqueada. Entre em contato com o suporte." };
  if (user.status === "SUSPENDED") return { error: "Conta suspensa. Entre em contato com o suporte." };

  await setSessionCookie({ userId: user.id, role: user.role, name: user.name });

  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "PROVIDER") redirect("/prestador/painel");
  redirect("/app");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}
