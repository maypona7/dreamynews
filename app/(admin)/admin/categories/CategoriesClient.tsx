"use client";

import { useState, useTransition } from "react";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/actions/categories";
import type { Category } from "@/lib/types";

const PRESET_EMOJIS = [
  "📢",
  "📅",
  "🎉",
  "🏫",
  "📝",
  "💡",
  "📚",
  "🚨",
];

export default function CategoriesClient({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string>(PRESET_EMOJIS[0]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const { id, order } = await createCategoryAction({ name, emoji });
        setCategories((prev) => [
          ...prev,
          { id, name, emoji, order },
        ]);
        setName("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "추가 실패");
      }
    });
  }

  function rename(id: string, value: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: value } : c)),
    );
  }

  function commitRename(id: string, value: string) {
    startTransition(async () => {
      try {
        await updateCategoryAction(id, { name: value });
      } catch (e) {
        setError(e instanceof Error ? e.message : "수정 실패");
      }
    });
  }

  function updateEmoji(id: string, value: string) {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, emoji: value } : c)),
    );
    startTransition(async () => {
      try {
        await updateCategoryAction(id, { emoji: value });
      } catch (e) {
        setError(e instanceof Error ? e.message : "수정 실패");
      }
    });
  }

  function remove(id: string) {
    if (!confirm("카테고리를 삭제할까요? 이 카테고리의 게시글은 분류가 해제됩니다.")) return;
    startTransition(async () => {
      try {
        await deleteCategoryAction(id);
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "삭제 실패");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-900">카테고리 추가</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            className="input flex-1"
            placeholder="예: 학사일정"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
          <EmojiPicker value={emoji} onChange={setEmoji} />
          <button
            type="button"
            className="btn-primary"
            disabled={pending || !name.trim()}
            onClick={add}
          >
            추가
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="card divide-y divide-slate-100 overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            아직 카테고리가 없어요
          </div>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="p-4 flex items-center gap-3"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-base">
                {c.emoji ?? "🏷️"}
              </span>
              <input
                type="text"
                className="input !py-1 flex-1"
                value={c.name}
                onChange={(e) => rename(c.id, e.target.value)}
                onBlur={(e) => commitRename(c.id, e.target.value)}
                maxLength={50}
              />
              <EmojiPicker
                value={c.emoji ?? PRESET_EMOJIS[0]}
                onChange={(v) => updateEmoji(c.id, v)}
              />
              <button
                type="button"
                className="btn-danger !py-1 !text-xs"
                disabled={pending}
                onClick={() => remove(c.id)}
              >
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        className="input !w-20 !py-1 text-center"
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="😀"
        maxLength={8}
        aria-label="카테고리 이모지 입력"
      />
      <div className="flex items-center gap-1">
        {PRESET_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`이모지 ${emoji}`}
            onClick={() => onChange(emoji)}
            className={
              value === emoji
                ? "inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 ring-2 ring-offset-1 ring-slate-400"
                : "inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200"
            }
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
