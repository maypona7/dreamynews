"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import PostCard from "@/components/PostCard";
import CategoryFilter from "@/components/CategoryFilter";
import {
  subscribeCategories,
  subscribePosts,
} from "@/lib/firebase/queries";
import type { Category, Post, PostStatus } from "@/lib/types";

export default function FeedClient() {
  const router = useRouter();
  const params = useSearchParams();
  const urlTab: PostStatus =
    params.get("tab") === "archived" ? "archived" : "published";

  const [tab, setTab] = useState<PostStatus>(urlTab);
  const [, startTransition] = useTransition();

  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    setTab(urlTab);
  }, [urlTab]);

  useEffect(() => subscribeCategories(setCategories), []);

  useEffect(() => {
    setPosts(null);
    return subscribePosts(tab, null, setPosts);
  }, [tab]);

  const filteredPosts = useMemo(() => {
    if (posts === null) return null;
    if (!categoryId) return posts;
    return posts.filter((post) => post.categoryId === categoryId);
  }, [posts, categoryId]);

  useEffect(() => {
    if (!posts || posts.length === 0) return;
    // 첫 클릭 딜레이를 줄이기 위해 상단 게시글 상세 라우트를 미리 워밍업.
    posts.slice(0, 6).forEach((post) => {
      router.prefetch(`/posts/${post.id}`);
    });
  }, [posts, router]);

  const categoryMap = useMemo(() => {
    return Object.fromEntries(categories.map((c) => [c.id, c])) as Record<
      string,
      Category
    >;
  }, [categories]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setTab("published");
              startTransition(() => {
                router.replace("/feed", { scroll: false });
              });
            }}
            onMouseEnter={() => router.prefetch("/feed")}
            className={clsx(
              "px-3 py-1 rounded-md transition-colors",
              tab === "published"
                ? "bg-slate-900 text-white"
                : "text-slate-600",
            )}
          >
            게시중
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("archived");
              startTransition(() => {
                router.replace("/feed?tab=archived", { scroll: false });
              });
            }}
            onMouseEnter={() => router.prefetch("/feed?tab=archived")}
            className={clsx(
              "px-3 py-1 rounded-md transition-colors",
              tab === "archived"
                ? "bg-slate-900 text-white"
                : "text-slate-600",
            )}
          >
            아카이브
          </button>
        </div>
      </div>

      <CategoryFilter
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
      />

      {filteredPosts === null ? (
        <SkeletonGrid />
      ) : filteredPosts.length === 0 ? (
        <EmptyState archived={tab === "archived"} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPosts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              category={p.categoryId ? categoryMap[p.categoryId] ?? null : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="h-3 w-16 bg-slate-200 rounded mb-3" />
          <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
          <div className="h-4 w-full bg-slate-100 rounded" />
          <div className="h-4 w-2/3 bg-slate-100 rounded mt-1" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ archived }: { archived: boolean }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto mb-3 flex items-center justify-center text-slate-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      </div>
      <h3 className="font-medium text-slate-700">
        {archived ? "아카이브된 글이 없어요" : "아직 게시된 글이 없어요"}
      </h3>
      <p className="text-sm text-slate-500 mt-1">
        {archived ? "보관된 게시글이 여기에 모입니다." : "첫 글을 작성해보세요!"}
      </p>
    </div>
  );
}
