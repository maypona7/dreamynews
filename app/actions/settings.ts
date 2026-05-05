"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { settingsSchema } from "@/lib/schemas";
import type { AppSettings } from "@/lib/types";

const DEFAULTS: AppSettings = { autoApprove: true, siteName: "학교 소식함" };

export async function getSettingsAction(): Promise<AppSettings> {
  await requireRole(["admin"]);
  const snap = await adminDb().collection("settings").doc("global").get();
  if (!snap.exists) return DEFAULTS;
  const d = snap.data() ?? {};
  return {
    autoApprove: d.autoApprove ?? DEFAULTS.autoApprove,
    siteName: d.siteName ?? DEFAULTS.siteName,
  };
}

export async function updateSettingsAction(input: {
  autoApprove: boolean;
  siteName: string;
}) {
  const parsed = settingsSchema.parse(input);
  await requireRole(["admin"]);
  await adminDb()
    .collection("settings")
    .doc("global")
    .set(parsed, { merge: true });
  revalidatePath("/admin/settings");
}
