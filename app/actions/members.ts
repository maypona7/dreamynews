"use server";

import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { memberStatusSchema, roleChangeSchema } from "@/lib/schemas";
import { FieldValue } from "firebase-admin/firestore";

export async function listMembersAction() {
  await requireRole(["admin"]);
  const snap = await adminDb()
    .collection("users")
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    const toMs = (v: unknown): number | null => {
      if (!v) return null;
      if (typeof v === "number") return v;
      if (typeof (v as { toMillis?: () => number }).toMillis === "function") {
        return (v as { toMillis: () => number }).toMillis();
      }
      return null;
    };
    return {
      uid: d.id,
      email: data.email ?? null,
      displayName: data.displayName ?? null,
      photoURL: data.photoURL ?? null,
      role: data.role ?? "viewer",
      status: data.status ?? "pending",
      createdAt: toMs(data.createdAt) ?? 0,
      approvedAt: toMs(data.approvedAt),
    };
  });
}

export async function changeRoleAction(input: { uid: string; role: string }) {
  const parsed = roleChangeSchema.parse(input);
  const admin = await requireRole(["admin"]);
  if (parsed.uid === admin.uid && parsed.role !== "admin") {
    throw new Error("CANNOT_DEMOTE_SELF");
  }
  const userRef = adminDb().collection("users").doc(parsed.uid);
  const snap = await userRef.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  await userRef.update({ role: parsed.role });

  const data = snap.data() ?? {};
  const status = data.status ?? "pending";
  await adminAuth().setCustomUserClaims(parsed.uid, {
    role: parsed.role,
    status,
  });
  revalidatePath("/admin/members");
}

export async function changeStatusAction(input: { uid: string; status: string }) {
  const parsed = memberStatusSchema.parse(input);
  const admin = await requireRole(["admin"]);
  const userRef = adminDb().collection("users").doc(parsed.uid);
  const snap = await userRef.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  const updates: Record<string, unknown> = { status: parsed.status };
  if (parsed.status === "approved") {
    updates.approvedAt = FieldValue.serverTimestamp();
    updates.approvedBy = admin.uid;
  }
  await userRef.update(updates);
  const data = snap.data() ?? {};
  await adminAuth().setCustomUserClaims(parsed.uid, {
    role: data.role ?? "viewer",
    status: parsed.status,
  });
  revalidatePath("/admin/members");
}
