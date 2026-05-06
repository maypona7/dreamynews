"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { AppUser } from "@/lib/types";

export default function Header({
  siteName,
  appUser,
}: {
  siteName: string;
  appUser: AppUser;
}) {
  const { signOut, role, firebaseUser } = useAuth();
  const router = useRouter();
  const effectiveRole = role ?? appUser.role;
  const profilePhotoURL = appUser.photoURL ?? firebaseUser?.photoURL ?? null;

  return (
    <header className="sticky top-0 z-30 border-b border-brand-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <Link href="/feed" className="flex h-8 items-center">
          <span className="inline-flex h-8 items-center font-semibold leading-none text-brand-950">
            {siteName}
          </span>
        </Link>
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
            <div className="w-8 h-8 rounded-full bg-brand-200" />
          )}
          <button
            type="button"
            className="text-xs text-brand-600 hover:text-brand-800"
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
