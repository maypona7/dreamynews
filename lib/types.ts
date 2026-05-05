export type Role = "viewer" | "writer" | "admin";
export type UserStatus = "pending" | "approved" | "rejected";

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: Role;
  status: UserStatus;
  createdAt: number;
  approvedAt: number | null;
  approvedBy: string | null;
  invitedBy: string | null;
}

export type PostStatus = "published" | "archived";

export interface PostAuthor {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface Post {
  id: string;
  title: string;
  contentHtml: string;
  excerpt: string;
  author: PostAuthor;
  categoryId: string | null;
  eventAt: number | null;
  status: PostStatus;
  pinned: boolean;
  reactionCounts: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

export interface Reaction {
  id: string;
  uid: string;
  emoji: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  emoji: string | null;
}

export type InviteStatus = "active" | "revoked";

export interface Invite {
  code: string;
  role: Exclude<Role, "admin">;
  createdBy: string;
  createdAt: number;
  expiresAt: number | null;
  maxUses: number;
  useCount: number;
  status: InviteStatus;
  note: string | null;
}

export interface AppSettings {
  autoApprove: boolean;
  siteName: string;
}

export const DEFAULT_REACTIONS = ["👍", "❤️", "🎉", "😮", "😢", "🔥"] as const;
