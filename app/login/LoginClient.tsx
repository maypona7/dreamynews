"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function LoginClient() {
  const { firebaseUser, appUser, signIn, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/feed";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (firebaseUser) {
      if (!appUser) {
        // Let server-side guards resolve final destination when profile sync lags.
        router.replace("/");
        return;
      }
      if (appUser.status === "pending") router.replace("/pending");
      else if (appUser.status === "rejected") router.replace("/rejected");
      else router.replace(next);
    }
  }, [firebaseUser, appUser, loading, router, next]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-50 px-4">
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-brand-950">소식함</h1>
        <p className="text-brand-600 mt-2 text-sm">
          학교 소식과 공지를 한 곳에서 모아 보세요.
        </p>
        <button
          type="button"
          className="btn-primary w-full mt-8"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await signIn();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "로그인에 실패했습니다",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <GoogleLogo />
          {busy ? "로그인 중..." : "Google로 계속하기"}
        </button>
        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.2 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2 4-3.7 5.5l6.2 5.2C41.6 35.6 44 30.2 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
