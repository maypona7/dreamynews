import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import type {
  AppUser,
  Category,
  Invite,
  Post,
  Reaction,
} from "@/lib/types";

function toMillis(value: unknown, fallback = 0): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  if (
    value &&
    typeof value === "object" &&
    "_seconds" in (value as Record<string, unknown>)
  ) {
    const v = value as { _seconds: number; _nanoseconds?: number };
    return v._seconds * 1000 + Math.floor((v._nanoseconds ?? 0) / 1e6);
  }
  return fallback;
}

export const userConverter: FirestoreDataConverter<AppUser> = {
  toFirestore(u) {
    return u as Record<string, unknown>;
  },
  fromFirestore(snap: QueryDocumentSnapshot): AppUser {
    const d = snap.data();
    return {
      uid: snap.id,
      email: d.email ?? null,
      displayName: d.displayName ?? null,
      photoURL: d.photoURL ?? null,
      role: d.role ?? "viewer",
      status: d.status ?? "pending",
      createdAt: toMillis(d.createdAt),
      approvedAt: d.approvedAt ? toMillis(d.approvedAt) : null,
      approvedBy: d.approvedBy ?? null,
      invitedBy: d.invitedBy ?? null,
    };
  },
};

export const postConverter: FirestoreDataConverter<Post> = {
  toFirestore(p) {
    return p as Record<string, unknown>;
  },
  fromFirestore(snap: QueryDocumentSnapshot): Post {
    const d = snap.data();
    const rawEventAt = d.eventAt;
    return {
      id: snap.id,
      title: d.title ?? "",
      contentHtml: d.contentHtml ?? "",
      excerpt: d.excerpt ?? "",
      author: {
        uid: d.author?.uid ?? "",
        displayName: d.author?.displayName ?? null,
        photoURL: d.author?.photoURL ?? null,
      },
      categoryId: d.categoryId ?? null,
      eventAt: rawEventAt ? toMillis(rawEventAt) : null,
      status: d.status ?? "published",
      pinned: !!d.pinned,
      reactionCounts: d.reactionCounts ?? {},
      createdAt: toMillis(d.createdAt),
      updatedAt: toMillis(d.updatedAt),
    };
  },
};

export const reactionConverter: FirestoreDataConverter<Reaction> = {
  toFirestore(r) {
    return r as Record<string, unknown>;
  },
  fromFirestore(snap: QueryDocumentSnapshot): Reaction {
    const d = snap.data();
    return {
      id: snap.id,
      uid: d.uid ?? "",
      emoji: d.emoji ?? "",
      createdAt: toMillis(d.createdAt),
    };
  },
};

export const categoryConverter: FirestoreDataConverter<Category> = {
  toFirestore(c) {
    return c as Record<string, unknown>;
  },
  fromFirestore(snap: QueryDocumentSnapshot): Category {
    const d = snap.data();
    return {
      id: snap.id,
      name: d.name ?? "",
      order: d.order ?? 0,
      emoji: d.emoji ?? null,
    };
  },
};

export const inviteConverter: FirestoreDataConverter<Invite> = {
  toFirestore(i) {
    return i as Record<string, unknown>;
  },
  fromFirestore(snap: QueryDocumentSnapshot): Invite {
    const d = snap.data();
    return {
      code: snap.id,
      role: d.role ?? "viewer",
      createdBy: d.createdBy ?? "",
      createdAt: toMillis(d.createdAt),
      expiresAt: d.expiresAt ? toMillis(d.expiresAt) : null,
      maxUses: d.maxUses ?? 1,
      useCount: d.useCount ?? 0,
      status: d.status ?? "active",
      note: d.note ?? null,
    };
  },
};
