"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QuillEditor from "@/components/QuillEditor";
import { subscribeCategories } from "@/lib/firebase/queries";
import {
  createPostAction,
  updatePostAction,
} from "@/app/actions/posts";
import type { Category, Post } from "@/lib/types";

function msToDateInputValue(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateInputValueToMs(value: string): number | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  // Store at local midnight so it doesn't drift due to UTC conversion.
  return new Date(y, m - 1, d).getTime();
}

interface Props {
  mode: "create" | "edit";
  post?: Post | null;
  onCreateSuccess?: "close" | "feed";
}

export default function PostForm({
  mode,
  post,
  onCreateSuccess = "feed",
}: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState(post?.title ?? "");
  const [contentHtml, setContentHtml] = useState(post?.contentHtml ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(
    post?.categoryId ?? null,
  );
  const [pinned, setPinned] = useState(post?.pinned ?? false);
  const [eventAt, setEventAt] = useState<number | null>(post?.eventAt ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      subscribeCategories(setCategories, () => {
        setCategories([]);
        setError("카테고리를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      }),
    [],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("제목을 입력해주세요");
      return;
    }
    if (!contentHtml.trim() || contentHtml === "<p><br></p>") {
      setError("내용을 입력해주세요");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === "create") {
        await createPostAction({
          title,
          contentHtml,
          categoryId,
          pinned,
          eventAt,
        });
        if (onCreateSuccess === "close") {
          router.back();
        } else {
          router.replace("/feed");
        }
      } else if (post) {
        await updatePostAction(post.id, {
          title,
          contentHtml,
          categoryId,
          pinned,
          status: post.status,
          eventAt,
        });
        router.replace(`/posts/${post.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          제목
        </label>
        <input
          type="text"
          className="input text-lg"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="공지 제목을 입력하세요"
          required
          maxLength={200}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            카테고리
          </label>
          <select
            className="input"
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value || null)}
          >
            <option value="">선택 안 함</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {(c.emoji ? `${c.emoji} ` : "") + c.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 mt-6 sm:mt-7 select-none">
          <input
            type="checkbox"
            className="w-4 h-4 rounded"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
          />
          <span className="text-sm text-slate-700">상단에 고정</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          행사일
        </label>
        <input
          type="date"
          className="input"
          value={msToDateInputValue(eventAt)}
          onChange={(e) => setEventAt(dateInputValueToMs(e.target.value))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          내용
        </label>
        <QuillEditor value={contentHtml} onChange={setContentHtml} />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.back()}
          disabled={busy}
        >
          취소
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "저장 중..." : mode === "create" ? "게시" : "저장"}
        </button>
      </div>
    </form>
  );
}
