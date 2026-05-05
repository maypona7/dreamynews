"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { href: "/admin/members", label: "멤버" },
  { href: "/admin/invites", label: "초대링크" },
  { href: "/admin/categories", label: "카테고리" },
  { href: "/admin/settings", label: "설정" },
];

export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b border-slate-200 -mt-2">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
              active
                ? "border-brand-600 text-brand-700 font-medium"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
