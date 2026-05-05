import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { FieldValue } from "firebase-admin/firestore";
import type { AppSettings, Role, UserStatus } from "@/lib/types";

export async function POST(req: Request) {
  let body: { idToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const idToken = body.idToken;
  if (!idToken) {
    return NextResponse.json({ error: "MISSING_TOKEN" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(idToken);
  } catch (error) {
    const e = error as { code?: string; message?: string };
    console.error("verifyIdToken failed", {
      code: e.code,
      message: e.message,
    });
    return NextResponse.json(
      {
        error: "INVALID_TOKEN",
        reason:
          process.env.NODE_ENV === "development"
            ? (e.code ?? e.message ?? "unknown")
            : undefined,
      },
      { status: 401 },
    );
  }

  const uid = decoded.uid;
  const userRef = adminDb().collection("users").doc(uid);
  const settingsRef = adminDb().collection("settings").doc("global");

  const [userSnap, settingsSnap] = await Promise.all([
    userRef.get(),
    settingsRef.get(),
  ]);

  const settings = (settingsSnap.exists
    ? settingsSnap.data()
    : { autoApprove: true, siteName: "학교 소식함" }) as AppSettings;

  const usersCount = (
    await adminDb().collection("users").count().get()
  ).data().count;

  let role: Role;
  let status: UserStatus;

  if (!userSnap.exists) {
    // First user becomes admin automatically.
    if (usersCount === 0) {
      role = "admin";
      status = "approved";
    } else {
      role = "viewer";
      status = settings.autoApprove ? "approved" : "pending";
    }
    await userRef.set({
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      photoURL: decoded.picture ?? null,
      role,
      status,
      createdAt: FieldValue.serverTimestamp(),
      approvedAt: status === "approved" ? FieldValue.serverTimestamp() : null,
      approvedBy: null,
      invitedBy: null,
    });
  } else {
    const data = userSnap.data() ?? {};
    role = (data.role as Role) ?? "viewer";
    status = (data.status as UserStatus) ?? "pending";

    const updates: Record<string, unknown> = {};
    if (data.email !== decoded.email) updates.email = decoded.email ?? null;
    if (data.displayName !== decoded.name)
      updates.displayName = decoded.name ?? null;
    if (data.photoURL !== decoded.picture)
      updates.photoURL = decoded.picture ?? null;
    if (Object.keys(updates).length > 0) {
      await userRef.update(updates);
    }
  }

  // Sync custom claims if drifted.
  const currentClaims = (decoded as Record<string, unknown>) as {
    role?: string;
    status?: string;
  };
  if (currentClaims.role !== role || currentClaims.status !== status) {
    await adminAuth().setCustomUserClaims(uid, { role, status });
  }

  await setSessionCookie(idToken);
  return NextResponse.json({ ok: true, role, status });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
