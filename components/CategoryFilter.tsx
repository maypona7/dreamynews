"use client";

import clsx from "clsx";
import type { Category } from "@/lib/types";

export default function CategoryFilter({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
      <button
        type="button"
        className={clsx(
          "px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors",
          value === null
            ? "bg-slate-900 text-white border-slate-900"
            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
        )}
        onClick={() => onChange(null)}
      >
        전체
      </button>
      {categories.map((c) => (
        <button
          key={c.id}
          type="button"
          className={clsx(
            "px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors",
            value === c.id
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
          )}
          onClick={() => onChange(c.id)}
        >
          <span className="mr-1" aria-hidden="true">
            {c.emoji ?? "🏷️"}
          </span>
          {c.name}
        </button>
      ))}
    </div>
  );
}
