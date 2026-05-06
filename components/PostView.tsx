"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { useAuth } from "@/lib/auth/AuthProvider";
import { subscribeCategories, subscribePost } from "@/lib/firebase/queries";
import { markPostRead } from "@/lib/readTracker";
import {
  deletePostAction,
  setPinnedAction,
  setStatusAction,
} from "@/app/actions/posts";
import ReactionBar from "@/components/ReactionBar";
import type { Category, Post } from "@/lib/types";

export default function PostView({
  postId,
  initialPost = null,
  variant,
}: {
  postId: string;
  initialPost?: Post | null;
  variant: "page" | "modal";
}) {
  const router = useRouter();
  const { firebaseUser, role, isApproved } = useAuth();
  const [post, setPost] = useState<Post | null>(initialPost);
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribePost(postId, setPost), [postId]);
  useEffect(() => subscribeCategories(setCategories), []);

  useEffect(() => {
    if (post) markPostRead(post.id, Date.now());
  }, [post]);

  const category = useMemo(() => {
    if (!post?.categoryId) return null;
    return categories.find((c) => c.id === post.categoryId) ?? null;
  }, [post, categories]);

  if (!post) {
    return (
      <div className="card p-10 text-center text-brand-600">로딩중...</div>
    );
  }

  const isOwner = firebaseUser?.uid === post.author.uid;
  const canEdit = isApproved && (isOwner || role === "admin");
  const canDelete = canEdit;

  async function safe<T>(fn: () => Promise<T>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={clsx("flex flex-col gap-5", variant === "modal" && "max-h-[85vh] overflow-y-auto")}>
      <header className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {post.pinned && (
            <span className="badge bg-amber-100 text-amber-700">고정</span>
          )}
          {category && (
            <span className="badge bg-brand-100 text-brand-800">
              <span aria-hidden="true">{category.emoji ?? "🏷️"}</span>
              {category.name}
            </span>
          )}
          {post.eventAt && (
            <span className="badge bg-brand-50 text-brand-700">
              <span aria-hidden="true">📅</span>
              {formatDate(post.eventAt)}
            </span>
          )}
          {post.status === "archived" && (
            <span className="badge bg-brand-100 text-brand-700">아카이브</span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-950">
          {post.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-brand-600">
          {post.author.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author.photoURL}
              alt=""
              className="w-7 h-7 rounded-full"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-brand-200" />
          )}
          <span>{post.author.displayName ?? "익명"}</span>
          <span>·</span>
          <time dateTime={new Date(post.createdAt).toISOString()}>
            {new Date(post.createdAt).toLocaleString("ko-KR")}
          </time>
          {post.updatedAt > post.createdAt + 1000 && (
            <span className="text-xs text-brand-500">(수정됨)</span>
          )}
        </div>
      </header>

      <div
        className="prose-content"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      <div className="border-t border-brand-100 pt-4">
        <ReactionBar postId={post.id} counts={post.reactionCounts} />
      </div>

      {(canEdit || canDelete) && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-brand-100">
          {canEdit &&
            (variant === "modal" ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => router.replace(`/posts/${post.id}/edit`)}
              >
                수정
              </button>
            ) : (
              <Link href={`/posts/${post.id}/edit`} className="btn-secondary">
                수정
              </Link>
            ))}
          {canEdit && (
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() => safe(() => setPinnedAction(post.id, !post.pinned))}
            >
              {post.pinned ? "고정 해제" : "상단 고정"}
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="btn-secondary"
              disabled={busy}
              onClick={() =>
                safe(() =>
                  setStatusAction(
                    post.id,
                    post.status === "published" ? "archived" : "published",
                  ),
                )
              }
            >
              {post.status === "published" ? "아카이브" : "복구"}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="btn-danger ml-auto"
              disabled={busy}
              onClick={async () => {
                if (!confirm("이 게시글을 삭제할까요?")) return;
                await safe(async () => {
                  await deletePostAction(post.id);
                  if (variant === "modal") router.back();
                  else router.replace("/feed");
                });
              }}
            >
              삭제
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </article>
  );
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
