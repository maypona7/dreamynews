"use client";

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import {
  categoryConverter,
  postConverter,
  reactionConverter,
} from "@/lib/firebase/converters";
import type { Category, Post, PostStatus, Reaction } from "@/lib/types";

export function subscribePosts(
  status: PostStatus,
  categoryId: string | null,
  cb: (posts: Post[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  const baseRef = collection(getDb(), "posts").withConverter(postConverter);
  const constraints = [where("status", "==", status)];
  if (categoryId) constraints.push(where("categoryId", "==", categoryId));
  const q = query(
    baseRef,
    ...constraints,
    orderBy("pinned", "desc"),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      cb(snap.docs.map((d) => d.data()));
    },
    (error) => onError?.(error),
  );
}

export function subscribeCategories(
  cb: (categories: Category[]) => void,
  onError?: (error: unknown) => void,
) {
  // Categories는 글쓰기/피드/상세에서 자주 쓰이므로,
  // 앱 세션 동안 단 1번만 Firestore listener를 유지해 중복 쿼리를 막습니다.
  subscribeCategoriesStore.addListener(cb, onError);
  return () => {
    subscribeCategoriesStore.removeListener(cb);
  };
}

const subscribeCategoriesStore = (() => {
  let cached: Category[] | null = null;
  let unsubscribe: Unsubscribe | null = null;
  const listeners = new Map<
    (categories: Category[]) => void,
    ((error: unknown) => void) | undefined
  >();

  function start() {
    const ref = collection(getDb(), "categories").withConverter(
      categoryConverter,
    );
    const q = query(ref, orderBy("order", "asc"));
    unsubscribe = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => d.data());
        cached = next;
        for (const [fn] of listeners) fn(next);
      },
      (error) => {
        for (const [, errFn] of listeners) errFn?.(error);
      },
    );
  }

  return {
    addListener: (cb: (categories: Category[]) => void, onError?: (error: unknown) => void) => {
      // 캐시가 있으면 즉시 렌더에 반영.
      if (cached) cb(cached);
      listeners.set(cb, onError);
      if (!unsubscribe) start();
    },
    removeListener: (cb: (categories: Category[]) => void) => {
      listeners.delete(cb);
      if (listeners.size === 0 && unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    },
  };
})();

export function subscribePost(
  postId: string,
  cb: (post: Post | null) => void,
): Unsubscribe {
  const ref = doc(getDb(), "posts", postId).withConverter(postConverter);
  return onSnapshot(ref, (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}

export function subscribeMyReactions(
  postId: string,
  uid: string,
  cb: (reactions: Reaction[]) => void,
): Unsubscribe {
  const ref = collection(getDb(), "posts", postId, "reactions").withConverter(
    reactionConverter,
  );
  const q = query(ref, where("uid", "==", uid));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data()));
  });
}
