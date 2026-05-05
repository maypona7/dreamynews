import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import Header from "@/components/Header";
import AdminTabs from "@/components/AdminTabs";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.appUser || session.appUser.status !== "approved")
    redirect("/pending");
  if (session.appUser.role !== "admin") redirect("/feed");

  return (
    <div className="min-h-screen flex flex-col">
      <Header siteName="" appUser={session.appUser} />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 sm:py-10 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-slate-900">관리자</h1>
          <Link href="/feed" className="btn-ghost">
            소식 보기
          </Link>
        </div>
        <AdminTabs />
        <div>{children}</div>
      </main>
    </div>
  );
}
