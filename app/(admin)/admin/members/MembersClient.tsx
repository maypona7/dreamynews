"use client";

import { useState, useTransition } from "react";
import {
  changeRoleAction,
  changeStatusAction,
} from "@/app/actions/members";
import { useAuth } from "@/lib/auth/AuthProvider";

interface Member {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
  status: string;
  createdAt: number;
  approvedAt: number | null;
}

export default function MembersClient({
  initialMembers,
}: {
  initialMembers: Member[];
}) {
  const { firebaseUser } = useAuth();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = members.filter((m) =>
    filter === "all" ? true : m.status === filter,
  );

  function update(uid: string, patch: Partial<Member>) {
    setMembers((prev) =>
      prev.map((m) => (m.uid === uid ? { ...m, ...patch } : m)),
    );
  }

  function setRole(uid: string, role: string) {
    setError(null);
    startTransition(async () => {
      try {
        await changeRoleAction({ uid, role });
        update(uid, { role });
      } catch (e) {
        setError(e instanceof Error ? e.message : "역할 변경 실패");
      }
    });
  }

  function setStatus(uid: string, status: "approved" | "rejected") {
    setError(null);
    startTransition(async () => {
      try {
        await changeStatusAction({ uid, status });
        update(uid, {
          status,
          approvedAt: status === "approved" ? Date.now() : null,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "상태 변경 실패");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? "px-3 py-1 rounded-full text-sm bg-brand-600 text-white"
                : "px-3 py-1 rounded-full text-sm bg-white text-brand-700 border border-brand-200"
            }
          >
            {labelFor(f)}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="card divide-y divide-brand-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-brand-600">
            해당하는 멤버가 없어요
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.uid}
              className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {m.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photoURL}
                    alt=""
                    className="w-9 h-9 rounded-full"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-brand-200" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-brand-950 truncate">
                    {m.displayName ?? "이름 없음"}
                    {firebaseUser?.uid === m.uid && (
                      <span className="ml-2 badge bg-brand-50 text-brand-700">
                        나
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-brand-600 truncate">
                    {m.email}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={m.status} />
                <select
                  value={m.role}
                  disabled={
                    pending || (firebaseUser?.uid === m.uid && m.role === "admin")
                  }
                  onChange={(e) => setRole(m.uid, e.target.value)}
                  className="input !w-auto !py-1 text-sm"
                >
                  <option value="viewer">viewer</option>
                  <option value="writer">writer</option>
                  <option value="admin">admin</option>
                </select>
                {m.status === "pending" && (
                  <>
                    <button
                      type="button"
                      className="btn-primary !py-1 !text-xs"
                      disabled={pending}
                      onClick={() => setStatus(m.uid, "approved")}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      className="btn-danger !py-1 !text-xs"
                      disabled={pending}
                      onClick={() => setStatus(m.uid, "rejected")}
                    >
                      거절
                    </button>
                  </>
                )}
                {m.status === "approved" && firebaseUser?.uid !== m.uid && (
                  <button
                    type="button"
                    className="btn-secondary !py-1 !text-xs"
                    disabled={pending}
                    onClick={() => setStatus(m.uid, "rejected")}
                  >
                    차단
                  </button>
                )}
                {m.status === "rejected" && (
                  <button
                    type="button"
                    className="btn-secondary !py-1 !text-xs"
                    disabled={pending}
                    onClick={() => setStatus(m.uid, "approved")}
                  >
                    복구
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function labelFor(f: "all" | "pending" | "approved" | "rejected") {
  return { all: "전체", pending: "대기중", approved: "승인됨", rejected: "거절" }[f];
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };
  const label: Record<string, string> = {
    pending: "대기중",
    approved: "승인",
    rejected: "거절",
  };
  return (
    <span className={`badge ${styles[status] ?? "bg-brand-100 text-brand-700"}`}>
      {label[status] ?? status}
    </span>
  );
}
