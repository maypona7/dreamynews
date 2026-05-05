"use server";

import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/session";
import { reactionSchema } from "@/lib/schemas";
import { FieldValue } from "firebase-admin/firestore";

export async function toggleReactionAction(input: {
  postId: string;
  emoji: string;
}) {
  const parsed = reactionSchema.parse(input);
  const session = await getSessionUser();
  if (!session?.appUser || session.appUser.status !== "approved") {
    throw new Error("FORBIDDEN");
  }
  const uid = session.uid;
  const { postId, emoji } = parsed;
  const db = adminDb();
  const postRef = db.collection("posts").doc(postId);
  const reactionRef = postRef.collection("reactions").doc(`${uid}_${emoji}`);

  try {
    await db.runTransaction(async (tx) => {
      // Fast path: we only read the reaction doc.
      // Post existence is validated by tx.update (fails if missing).
      const reactionSnap = await tx.get(reactionRef);

      if (reactionSnap.exists) {
        tx.delete(reactionRef);
        tx.update(postRef, {
          [`reactionCounts.${emoji}`]: FieldValue.increment(-1),
        });
      } else {
        tx.set(reactionRef, {
          uid,
          emoji,
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.update(postRef, {
          [`reactionCounts.${emoji}`]: FieldValue.increment(1),
        });
      }
    });
  } catch (error) {
    const e = error as { code?: number | string };
    // Firestore NOT_FOUND can surface as gRPC code 5.
    if (e.code === 5 || e.code === "not-found") {
      throw new Error("NOT_FOUND");
    }
    throw error;
  }
}
