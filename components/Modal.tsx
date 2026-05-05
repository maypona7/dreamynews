"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export default function Modal({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "page";
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") router.back();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [router]);

  const overlayClassName =
    variant === "page"
      ? "fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm"
      : "fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm";

  const dialogClassName =
    variant === "page"
      ? "bg-white rounded-2xl shadow-card w-full max-w-none p-5 sm:p-8 relative max-h-[calc(100vh-3rem)] overflow-y-auto m-3 sm:m-6"
      : "bg-white rounded-2xl shadow-card w-full max-w-5xl p-5 sm:p-8 relative max-h-[90vh] overflow-y-auto";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={overlayClassName}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) router.back();
      }}
    >
      <div
        ref={dialogRef}
        className={dialogClassName}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
          aria-label="닫기"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
