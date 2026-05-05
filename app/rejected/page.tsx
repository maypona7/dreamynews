"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function RejectedPage() {
  const { signOut } = useAuth();
  const router = useRouter();
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">가입이 거절되었습니다</h1>
        <p className="text-slate-500 mt-2 text-sm">
          접근 권한이 없습니다. 관리자에게 문의해주세요.
        </p>
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
