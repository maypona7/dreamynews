"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { requireRole } from "@/lib/auth/session";
import { categorySchema } from "@/lib/schemas";
import type { Category } from "@/lib/types";

export async function listCategoriesAction(): Promise<Category[]> {
  await requireRole(["admin"]);
  const snap = await adminDb()
    .collection("categories")
    .orderBy("order", "asc")
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name ?? "",
      order: data.order ?? 0,
      emoji: data.emoji ?? null,
    };
  });
}

export async function createCategoryAction(input: {
  name: string;
  emoji?: string | null;
}) {
  const parsed = categorySchema.parse({
    name: input.name,
    order: 0,
    emoji: input.emoji ?? null,
  });
  await requireRole(["admin"]);
  const db = adminDb();
  const last = await db
    .collection("categories")
    .orderBy("order", "desc")
    .limit(1)
    .get();
  const order =
    last.empty || !last.docs[0].data().order
      ? 1
      : (last.docs[0].data().order ?? 0) + 1;
  const ref = db.collection("categories").doc();
  await ref.set({
    name: parsed.name,
    order,
    emoji: parsed.emoji,
  });
  revalidatePath("/admin/categories");
  return { id: ref.id, order };
}

export async function updateCategoryAction(
  id: string,
  input: { name?: string; emoji?: string | null; order?: number },
) {
  await requireRole(["admin"]);
  await adminDb().collection("categories").doc(id).update({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
    ...(input.order !== undefined ? { order: input.order } : {}),
  });
  revalidatePath("/admin/categories");
}

export async function deleteCategoryAction(id: string) {
  await requireRole(["admin"]);
  await adminDb().collection("categories").doc(id).delete();
  revalidatePath("/admin/categories");
}
