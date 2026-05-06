"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser, requireRole } from "@/lib/auth/session";
import { postSchema } from "@/lib/schemas";
import { FieldValue } from "firebase-admin/firestore";
import { sendNewPostEmail } from "@/lib/email";
import { sendNewPostGoogleChat } from "@/lib/google-chat";

function htmlToExcerpt(html: string, max = 180): string {
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export async function createPostAction(input: {
  title: string;
  contentHtml: string;
  categoryId: string | null;
  eventAt?: number | null;
  pinned?: boolean;
  status?: "published" | "archived";
}) {
  const parsed = postSchema.parse({
    title: input.title,
    contentHtml: input.contentHtml,
    categoryId: input.categoryId,
    eventAt: input.eventAt ?? null,
    pinned: input.pinned ?? false,
    status: input.status ?? "published",
  });
  const user = await requireRole(["writer", "admin"]);
  const ref = adminDb().collection("posts").doc();
  await ref.set({
    title: parsed.title,
    contentHtml: parsed.contentHtml,
    excerpt: htmlToExcerpt(parsed.contentHtml),
    author: {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
    },
    categoryId: parsed.categoryId,
    eventAt: parsed.eventAt,
    status: parsed.status,
    pinned: parsed.pinned,
    reactionCounts: {},
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  revalidatePath("/feed");
  const id = ref.id;

  // 이메일 알림은 실패해도 글 작성 자체는 성공하도록 분리.
  const notifyPayload = {
    title: parsed.title,
    excerpt: htmlToExcerpt(parsed.contentHtml),
    postId: id,
    eventAt: parsed.eventAt,
  };

  try {
    await sendNewPostEmail(notifyPayload);
  } catch (e) {
    console.error("sendNewPostEmail failed", e);
  }

  try {
    await sendNewPostGoogleChat(notifyPayload);
  } catch (e) {
    console.error("sendNewPostGoogleChat failed", e);
  }

  return { id };
}

export async function updatePostAction(
  postId: string,
  input: {
    title: string;
    contentHtml: string;
    categoryId: string | null;
    eventAt?: number | null;
    pinned?: boolean;
    status?: "published" | "archived";
  },
) {
  const parsed = postSchema.parse({
    title: input.title,
    contentHtml: input.contentHtml,
    categoryId: input.categoryId,
    eventAt: input.eventAt ?? null,
    pinned: input.pinned ?? false,
    status: input.status ?? "published",
  });
  const session = await getSessionUser();
  if (!session?.appUser || session.appUser.status !== "approved")
    throw new Error("FORBIDDEN");

  const ref = adminDb().collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  const data = snap.data() ?? {};
  const isOwner = data.author?.uid === session.uid;
  const isAdmin = session.appUser.role === "admin";
  if (!isOwner && !isAdmin) throw new Error("FORBIDDEN");

  await ref.update({
    title: parsed.title,
    contentHtml: parsed.contentHtml,
    excerpt: htmlToExcerpt(parsed.contentHtml),
    categoryId: parsed.categoryId,
    eventAt: parsed.eventAt,
    pinned: parsed.pinned,
    status: parsed.status,
    updatedAt: FieldValue.serverTimestamp(),
  });
  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
}

export async function setPinnedAction(postId: string, pinned: boolean) {
  const session = await getSessionUser();
  if (!session?.appUser || session.appUser.status !== "approved")
    throw new Error("FORBIDDEN");
  const ref = adminDb().collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  const data = snap.data() ?? {};
  const isOwner = data.author?.uid === session.uid;
  const isAdmin = session.appUser.role === "admin";
  if (!isOwner && !isAdmin) throw new Error("FORBIDDEN");
  await ref.update({ pinned, updatedAt: FieldValue.serverTimestamp() });
  revalidatePath("/feed");
}

export async function setStatusAction(
  postId: string,
  status: "published" | "archived",
) {
  const session = await getSessionUser();
  if (!session?.appUser || session.appUser.status !== "approved")
    throw new Error("FORBIDDEN");
  const ref = adminDb().collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  const data = snap.data() ?? {};
  const isOwner = data.author?.uid === session.uid;
  const isAdmin = session.appUser.role === "admin";
  if (!isOwner && !isAdmin) throw new Error("FORBIDDEN");
  await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });
  revalidatePath("/feed");
}

export async function deletePostAction(postId: string) {
  const session = await getSessionUser();
  if (!session?.appUser || session.appUser.status !== "approved")
    throw new Error("FORBIDDEN");
  const ref = adminDb().collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("NOT_FOUND");
  const data = snap.data() ?? {};
  const isOwner = data.author?.uid === session.uid;
  const isAdmin = session.appUser.role === "admin";
  if (!isOwner && !isAdmin) throw new Error("FORBIDDEN");

  // Delete reactions subcollection in batches.
  const reactionsRef = ref.collection("reactions");
  while (true) {
    const batchSnap = await reactionsRef.limit(200).get();
    if (batchSnap.empty) break;
    const batch = adminDb().batch();
    batchSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (batchSnap.size < 200) break;
  }

  await ref.delete();
  revalidatePath("/feed");
}
