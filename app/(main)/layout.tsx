import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import Header from "@/components/Header";

export default async function MainLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (!session.appUser || session.appUser.status === "pending")
    redirect("/pending");
  if (session.appUser.status === "rejected") redirect("/rejected");

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        siteName="학교 소식함"
        appUser={session.appUser}
      />
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
        {children}
      </main>
      {modal}
    </div>
  );
}
