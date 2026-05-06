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
  /** 클릭 직후 탭 UI·목록 전환을 위해 URL보다 앞서 적용 (URL과 맞으면 해제) */
  const [tabOverride, setTabOverride] = useState<PostStatus | null>(null);
  const status: PostStatus = tabOverride ?? urlTab;
  const [, startTabTransition] = useTransition();

  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeCategories(setCategories, (err) => {
        console.error("categories subscription", err);
      }),
    [],
  );

  useEffect(() => {
    if (tabOverride !== null && tabOverride === urlTab) {
      setTabOverride(null);
    }
  }, [urlTab, tabOverride]);

  useEffect(() => {
    router.prefetch("/feed");
    router.prefetch("/feed?tab=archived");
  }, [router]);

  useEffect(() => {
    setFirestoreError(null);
    setPosts(null);
    return subscribePosts(
      status,
      null,
      setPosts,
      (err) => {
        console.error("posts subscription", err);
        setFirestoreError(
          "목록을 불러오지 못했습니다. 로그아웃 후 다시 로그인하거나 페이지를 새로고침 해 주세요.",
        );
        setPosts([]);
      },
    );
  }, [status]);

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
        <div className="inline-flex rounded-lg border border-brand-200 bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setTabOverride("published");
              startTabTransition(() => {
                router.replace("/feed");
              });
            }}
            className={clsx(
              "px-3 py-1 rounded-md transition-colors duration-150 active:scale-[0.98]",
              status === "published"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-brand-600 hover:text-brand-800",
            )}
          >
            게시중
          </button>
          <button
            type="button"
            onClick={() => {
              setTabOverride("archived");
              startTabTransition(() => {
                router.replace("/feed?tab=archived");
              });
            }}
            className={clsx(
              "px-3 py-1 rounded-md transition-colors duration-150 active:scale-[0.98]",
              status === "archived"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-brand-600 hover:text-brand-800",
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

      {firestoreError && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {firestoreError}
        </div>
      )}

      {filteredPosts === null ? (
        <SkeletonGrid />
      ) : filteredPosts.length === 0 ? (
        <EmptyState archived={status === "archived"} />
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
          <div className="h-3 w-16 bg-brand-200 rounded mb-3" />
          <div className="h-5 w-3/4 bg-brand-200 rounded mb-2" />
          <div className="h-4 w-full bg-brand-100 rounded" />
          <div className="h-4 w-2/3 bg-brand-100 rounded mt-1" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ archived }: { archived: boolean }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-12 h-12 rounded-full bg-brand-100 mx-auto mb-3 flex items-center justify-center text-brand-500">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      </div>
      <h3 className="font-medium text-brand-800">
        {archived ? "아카이브된 글이 없어요" : "아직 게시된 글이 없어요"}
      </h3>
      <p className="text-sm text-brand-600 mt-1">
        {archived ? "보관된 게시글이 여기에 모입니다." : "첫 글을 작성해보세요!"}
      </p>
    </div>
  );
}
