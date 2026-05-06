"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { redeemInviteAction } from "@/app/actions/invites";

export default function RedeemClient({ code }: { code: string }) {
  const { firebaseUser, signIn, refreshIdToken, loading } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState<
    "idle" | "signing-in" | "redeeming" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) return;
    if (phase !== "idle") return;
    void redeem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, loading]);

  async function redeem() {
    setPhase("redeeming");
    setError(null);
    try {
      await redeemInviteAction(code);
      await refreshIdToken();
      // resync session with new claims
      const token = await refreshIdToken();
      if (token) {
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token }),
        });
      }
      setPhase("done");
      setTimeout(() => router.replace("/feed"), 800);
    } catch (e) {
      setError(translateError(e instanceof Error ? e.message : "REDEEM_FAILED"));
      setPhase("error");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mx-auto">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-brand-950">초대 코드 사용</h1>
        <p className="text-sm text-brand-600">
          초대 코드:{" "}
          <span className="font-mono text-brand-900">{code}</span>
        </p>

        {!firebaseUser ? (
          <button
            type="button"
            className="btn-primary w-full"
            disabled={phase === "signing-in"}
            onClick={async () => {
              setPhase("signing-in");
              try {
                await signIn();
              } catch (e) {
                setError(e instanceof Error ? e.message : "로그인 실패");
                setPhase("error");
              }
            }}
          >
            {phase === "signing-in" ? "로그인 중..." : "Google로 로그인하고 가입"}
          </button>
        ) : phase === "redeeming" ? (
          <p className="text-sm text-brand-600">초대 코드 적용 중...</p>
        ) : phase === "done" ? (
          <p className="text-sm text-emerald-600">가입이 완료되었어요. 이동 중...</p>
        ) : null}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

function translateError(code: string): string {
  switch (code) {
    case "INVITE_NOT_FOUND":
      return "초대 코드를 찾을 수 없어요";
    case "INVITE_INACTIVE":
      return "회수된 초대 코드입니다";
    case "INVITE_EXPIRED":
      return "만료된 초대 코드입니다";
    case "INVITE_EXHAUSTED":
      return "사용 가능 횟수를 초과했어요";
    default:
      return "초대 코드 적용에 실패했어요";
  }
}
