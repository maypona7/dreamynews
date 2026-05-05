"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center space-y-3">
        <h1 className="text-xl font-bold text-slate-900">문제가 발생했어요</h1>
        <p className="text-sm text-slate-500">잠시 후 다시 시도해 주세요.</p>
        <button type="button" className="btn-primary mt-2" onClick={() => reset()}>
          다시 시도
        </button>
      </div>
    </main>
  );
}
