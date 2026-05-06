import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-brand-500 text-sm">로딩중...</div>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
