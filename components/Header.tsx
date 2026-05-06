"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { AppUser } from "@/lib/types";
import clsx from "clsx";

export default function Header({
  siteName,
  appUser,
}: {
  siteName: string;
  appUser: AppUser;
}) {
  const { signOut, role, firebaseUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const effectiveRole = role ?? appUser.role;
  const profilePhotoURL = appUser.photoURL ?? firebaseUser?.photoURL ?? null;

  const navItems = [
    { href: "/feed", label: "소식" },
    { href: "/feed?tab=archived", label: "아카이브" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <Link href="/feed" className="flex h-8 items-center">
          <span className="inline-flex h-8 items-center font-semibold leading-none text-slate-900">
            {siteName}
          </span>
        </Link>
        <nav className="hidden sm:flex items-center gap-1 ml-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm",
                pathname === item.href.split("?")[0]
                  ? "text-brand-700 bg-brand-50"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        {(effectiveRole === "writer" || effectiveRole === "admin") && (
          <Link
            href="/posts/new"
            prefetch
            onMouseEnter={() => router.prefetch("/posts/new")}
            className="btn-primary !py-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            글쓰기
          </Link>
        )}
        {effectiveRole === "admin" && (
          <Link href="/admin/members" className="btn-ghost !py-1.5">
            관리자
          </Link>
        )}
        <div className="flex items-center gap-2">
          {profilePhotoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profilePhotoURL}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200" />
          )}
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-700"
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
