import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";

const COOKIE_NAME = "ea_session";
function getAuthSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET é obrigatório em produção.");
    }
    return "dev-secret-change-me-in-production-0123456789";
  }
  return s;
}
const secret = new TextEncoder().encode(getAuthSecret());

export type Role = "CUSTOMER" | "PROVIDER" | "ADMIN";

export interface SessionPayload {
  userId: number;
  role: Role;
  name: string;
}

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as number,
      role: payload.role as Role,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
});

/**
 * Autorização para server actions — valida papel E status no banco (fonte da
 * verdade), pois o JWT permanece válido por até 30 dias e ações podem ser
 * chamadas diretamente sem passar pela UI.
 */
export async function requireRole(role: Role): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  const [user] = await db
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!user || user.status !== "ACTIVE" || user.role !== role) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

/**
 * Sessão verificada contra o banco: o JWT dura 30 dias, mas o acesso deve
 * ser revogado imediatamente se o usuário for bloqueado/suspenso ou se o
 * papel no banco deixar de corresponder ao do token.
 */
export const getVerifiedSession = cache(async (): Promise<SessionPayload | null> => {
  const session = await getSession();
  if (!session) return null;
  const [user] = await db
    .select({ role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!user || user.status !== "ACTIVE" || user.role !== session.role) return null;
  return session;
});
