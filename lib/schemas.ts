import { z } from "zod";

export const postSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").max(200),
  contentHtml: z.string().min(1, "내용을 입력해주세요"),
  categoryId: z.string().nullable(),
  eventAt: z.number().int().nullable().default(null),
  pinned: z.boolean().default(false),
  status: z.enum(["published", "archived"]).default("published"),
});
export type PostInput = z.infer<typeof postSchema>;

export const categorySchema = z.object({
  name: z.string().min(1).max(50),
  order: z.number().int().default(0),
  emoji: z.string().trim().min(1).max(8).nullable().default(null),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const inviteSchema = z.object({
  role: z.enum(["viewer", "writer"]),
  maxUses: z.number().int().min(1).max(1000).default(1),
  expiresAt: z.number().int().nullable().default(null),
  note: z.string().max(200).nullable().default(null),
});
export type InviteInput = z.infer<typeof inviteSchema>;

export const settingsSchema = z.object({
  autoApprove: z.boolean(),
  siteName: z.string().min(1).max(100),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const roleChangeSchema = z.object({
  uid: z.string().min(1),
  role: z.enum(["viewer", "writer", "admin"]),
});

export const memberStatusSchema = z.object({
  uid: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
});

export const reactionSchema = z.object({
  postId: z.string().min(1),
  emoji: z.string().min(1).max(8),
});
