"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { Category, Post } from "@/lib/types";
import { useReadMap } from "@/lib/readTracker";

export default function PostCard({
  post,
  category,
}: {
  post: Post;
  category: Category | null;
}) {
  const router = useRouter();
  const readMap = useReadMap();
  const lastRead = readMap[post.id] ?? 0;
  const isUnread = post.updatedAt > lastRead;
  const href = `/posts/${post.id}`;

  function prefetchPost() {
    router.prefetch(href);
  }

  return (
    <Link
      href={href}
      prefetch
      scroll={false}
      className={clsx(
        "card p-5 flex flex-col gap-3 hover:shadow-md active:scale-[0.997] transition",
        post.pinned && "border-amber-200 bg-amber-50/40",
      )}
      aria-label={`게시글 ${post.title}`}
      onMouseEnter={prefetchPost}
      onTouchStart={prefetchPost}
      onFocus={prefetchPost}
    >
      <div className="flex items-center gap-2 flex-wrap">
        {post.pinned && (
          <span className="badge bg-amber-100 text-amber-700">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 6.5h6.6L15.6 13l2.1 6.5L12 15.5 6.3 19.5 8.4 13 3 8.5h6.6z" />
            </svg>
            고정
          </span>
        )}
        {category && (
          <span className="badge bg-slate-100 text-slate-700">
            <span aria-hidden="true">{category.emoji ?? "🏷️"}</span>
            {category.name}
          </span>
        )}
        {isUnread && (
          <span className="badge bg-brand-50 text-brand-700">NEW</span>
        )}
        {post.status === "archived" && (
          <span className="badge bg-slate-100 text-slate-600">아카이브</span>
        )}
      </div>
      <h3
        className={clsx(
          "text-lg font-semibold text-slate-900 line-clamp-2",
          isUnread && "text-brand-900",
        )}
      >
        {post.title}
      </h3>
      <p className="text-sm text-slate-600 line-clamp-3">{post.excerpt}</p>
      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {post.author.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author.photoURL}
              alt=""
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-200" />
          )}
          <span>{post.author.displayName ?? "익명"}</span>
          <span>·</span>
          <time dateTime={new Date(post.createdAt).toISOString()}>
            {formatRelative(post.createdAt)}
          </time>
        </div>
        <ReactionSummary counts={post.reactionCounts} />
      </div>
    </Link>
  );
}

function ReactionSummary({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <div className="flex items-center gap-1 text-xs text-slate-600">
      {entries.slice(0, 3).map(([emoji]) => (
        <span key={emoji} aria-hidden="true">
          {emoji}
        </span>
      ))}
      <span>{total}</span>
    </div>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(ts).toLocaleDateString("ko-KR");
}
