"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function PendingPage() {
  const { firebaseUser, appUser, signOut, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) router.replace("/login");
    else if (appUser && appUser.status === "approved") router.replace("/feed");
    else if (appUser && appUser.status === "rejected")
      router.replace("/rejected");
  }, [firebaseUser, appUser, loading, router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 2" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-brand-950">가입 승인 대기중</h1>
        <p className="text-brand-600 mt-2 text-sm leading-relaxed">
          관리자가 가입 요청을 검토하고 있어요.
          <br />
          승인되면 자동으로 입장할 수 있습니다.
        </p>
        {appUser?.email && (
          <p className="mt-4 text-xs text-brand-500">{appUser.email}</p>
        )}
        <button
          type="button"
          className="btn-secondary w-full mt-6"
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
        >
          로그아웃
        </button>
      </div>
    </main>
  );
}
