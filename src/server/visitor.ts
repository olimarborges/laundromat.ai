import "server-only";
import { cookies } from "next/headers";

export const VISITOR_COOKIE = "ew_visitor";

/** Lê o token de visitante (sem conta). */
export async function readVisitorToken(): Promise<string | null> {
  const store = await cookies();
  const v = store.get(VISITOR_COOKIE)?.value;
  return v && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

/** Garante o token (só em Server Actions / Route Handlers). */
export async function ensureVisitorToken(): Promise<string> {
  const existing = await readVisitorToken();
  if (existing) return existing;
  const token = crypto.randomUUID();
  (await cookies()).set(VISITOR_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return token;
}
