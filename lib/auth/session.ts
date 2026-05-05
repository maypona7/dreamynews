import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { userConverter } from "@/lib/firebase/server-converters";
import type { AppUser, Role } from "@/lib/types";

const SESSION_COOKIE = "dn_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION_MS,
  });
}

export async function setSessionCookie(idToken: string) {
  const sessionCookie = await createSessionCookie(idToken);
  const c = await cookies();
  c.set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

const getSessionUserByCookie = cache(
  async (
    session: string | undefined,
  ): Promise<{ uid: string; appUser: AppUser | null } | null> => {
    if (!session) return null;
    try {
      const decoded = await adminAuth().verifySessionCookie(session, true);
      const userSnap = await adminDb()
        .collection("users")
        .doc(decoded.uid)
        .withConverter(userConverter)
        .get();
      return {
        uid: decoded.uid,
        appUser: userSnap.exists ? (userSnap.data() ?? null) : null,
      };
    } catch {
      return null;
    }
  },
);

export async function getSessionUser(): Promise<{
  uid: string;
  appUser: AppUser | null;
} | null> {
  const c = await cookies();
  const session = c.get(SESSION_COOKIE)?.value;
  return getSessionUserByCookie(session);
}

export async function requireRole(roles: Role[]): Promise<AppUser> {
  const session = await getSessionUser();
  if (!session?.appUser) throw new Error("UNAUTHENTICATED");
  if (session.appUser.status !== "approved") throw new Error("NOT_APPROVED");
  if (!roles.includes(session.appUser.role)) throw new Error("FORBIDDEN");
  return session.appUser;
}
