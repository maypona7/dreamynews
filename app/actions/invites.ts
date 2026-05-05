"use server";

import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getSessionUser, requireRole } from "@/lib/auth/session";
import { inviteSchema } from "@/lib/schemas";
import { FieldValue } from "firebase-admin/firestore";
import type { Invite } from "@/lib/types";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomCode(len = 10) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join("");
}

function toMs(v: unknown): number | null {
  if (!v) return null;
  if (typeof v === "number") return v;
  if (typeof (v as { toMillis?: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  return null;
}

export async function listInvitesAction(): Promise<Invite[]> {
  await requireRole(["admin"]);
  const snap = await adminDb()
    .collection("invites")
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      code: d.id,
      role: data.role ?? "viewer",
      createdBy: data.createdBy ?? "",
      createdAt: toMs(data.createdAt) ?? 0,
      expiresAt: toMs(data.expiresAt),
      maxUses: data.maxUses ?? 1,
      useCount: data.useCount ?? 0,
      status: data.status ?? "active",
      note: data.note ?? null,
    };
  });
}

export async function createInviteAction(input: {
  role: "viewer" | "writer";
  maxUses?: number;
  expiresAt?: number | null;
  note?: string | null;
}) {
  const parsed = inviteSchema.parse({
    role: input.role,
    maxUses: input.maxUses ?? 1,
    expiresAt: input.expiresAt ?? null,
    note: input.note ?? null,
  });
  const admin = await requireRole(["admin"]);
  const code = randomCode(10);
  await adminDb()
    .collection("invites")
    .doc(code)
    .set({
      role: parsed.role,
      createdBy: admin.uid,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: parsed.expiresAt,
      maxUses: parsed.maxUses,
      useCount: 0,
      status: "active",
      note: parsed.note,
    });
  revalidatePath("/admin/invites");
  return { code };
}

export async function revokeInviteAction(code: string) {
  await requireRole(["admin"]);
  await adminDb()
    .collection("invites")
    .doc(code)
    .update({ status: "revoked" });
  revalidatePath("/admin/invites");
}

export async function deleteInviteAction(code: string) {
  await requireRole(["admin"]);
  await adminDb().collection("invites").doc(code).delete();
  revalidatePath("/admin/invites");
}

export async function redeemInviteAction(code: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("UNAUTHENTICATED");
  const uid = session.uid;
  const db = adminDb();
  const inviteRef = db.collection("invites").doc(code);
  const userRef = db.collection("users").doc(uid);

  let finalRole: "viewer" | "writer" | "admin" = "viewer";

  await db.runTransaction(async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists) throw new Error("INVITE_NOT_FOUND");
    const invite = inviteSnap.data() ?? {};
    if (invite.status !== "active") throw new Error("INVITE_INACTIVE");
    if (
      invite.expiresAt &&
      typeof (invite.expiresAt as { toMillis?: () => number }).toMillis ===
        "function" &&
      (invite.expiresAt as { toMillis: () => number }).toMillis() < Date.now()
    ) {
      throw new Error("INVITE_EXPIRED");
    }
    if ((invite.useCount ?? 0) >= (invite.maxUses ?? 1)) {
      throw new Error("INVITE_EXHAUSTED");
    }
    const inviteRole: "viewer" | "writer" =
      invite.role === "writer" ? "writer" : "viewer";

    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      finalRole = inviteRole;
      tx.set(userRef, {
        email: null,
        displayName: null,
        photoURL: null,
        role: inviteRole,
        status: "approved",
        createdAt: FieldValue.serverTimestamp(),
        approvedAt: FieldValue.serverTimestamp(),
        approvedBy: invite.createdBy ?? null,
        invitedBy: invite.createdBy ?? null,
      });
    } else {
      const data = userSnap.data() ?? {};
      const updates: Record<string, unknown> = { invitedBy: invite.createdBy };
      if (data.status !== "approved") {
        updates.status = "approved";
        updates.approvedAt = FieldValue.serverTimestamp();
        updates.approvedBy = invite.createdBy ?? null;
      }
      const hierarchy = { viewer: 0, writer: 1, admin: 2 } as const;
      const current =
        ((data.role as keyof typeof hierarchy) ?? "viewer") as
          | "viewer"
          | "writer"
          | "admin";
      if (hierarchy[inviteRole] > hierarchy[current]) {
        updates.role = inviteRole;
        finalRole = inviteRole;
      } else {
        finalRole = current;
      }
      tx.update(userRef, updates);
    }
    tx.update(inviteRef, { useCount: FieldValue.increment(1) });
  });

  await adminAuth().setCustomUserClaims(uid, {
    role: finalRole,
    status: "approved",
  });
  revalidatePath("/admin/invites");
  return { ok: true };
}
