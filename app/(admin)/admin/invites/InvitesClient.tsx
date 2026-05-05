"use client";

import { useState, useTransition } from "react";
import {
  createInviteAction,
  deleteInviteAction,
  revokeInviteAction,
} from "@/app/actions/invites";
import type { Invite } from "@/lib/types";

export default function InvitesClient({
  initialInvites,
}: {
  initialInvites: Invite[];
}) {
  const [invites, setInvites] = useState<Invite[]>(initialInvites);
  const [role, setRole] = useState<"viewer" | "writer">("viewer");
  const [maxUses, setMaxUses] = useState(1);
  const [expires, setExpires] = useState<string>("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function getInviteUrl(code: string) {
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/invite/${code}`;
  }

  function create() {
    setError(null);
    startTransition(async () => {
      try {
        const expiresAt = expires ? new Date(expires).getTime() : null;
        const { code } = await createInviteAction({
          role,
          maxUses,
          expiresAt,
          note: note.trim() || null,
        });
        setInvites((prev) => [
          {
            code,
            role,
            maxUses,
            useCount: 0,
            status: "active",
            createdBy: "",
            createdAt: Date.now(),
            expiresAt,
            note: note.trim() || null,
          },
          ...prev,
        ]);
        setNote("");
        setMaxUses(1);
        setExpires("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "초대링크 생성 실패");
      }
    });
  }

  function revoke(code: string) {
    startTransition(async () => {
      try {
        await revokeInviteAction(code);
        setInvites((prev) =>
          prev.map((i) => (i.code === code ? { ...i, status: "revoked" } : i)),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "회수 실패");
      }
    });
  }

  function remove(code: string) {
    if (!confirm("초대링크를 삭제할까요?")) return;
    startTransition(async () => {
      try {
        await deleteInviteAction(code);
        setInvites((prev) => prev.filter((i) => i.code !== code));
      } catch (e) {
        setError(e instanceof Error ? e.message : "삭제 실패");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">초대링크 발급</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">권한</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as "viewer" | "writer")}
            >
              <option value="viewer">viewer</option>
              <option value="writer">writer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">사용 횟수</label>
            <input
              type="number"
              min={1}
              max={1000}
              className="input"
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">만료일</label>
            <input
              type="date"
              className="input"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">메모</label>
            <input
              type="text"
              className="input"
              placeholder="예) 1학년 학부모"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={create}
          >
            발급
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="card overflow-hidden">
        {invites.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            발급된 초대링크가 없어요
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="p-3">코드</th>
                <th className="p-3">권한</th>
                <th className="p-3">사용</th>
                <th className="p-3">상태</th>
                <th className="p-3">메모</th>
                <th className="p-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invites.map((i) => {
                const url = getInviteUrl(i.code);
                const exhausted = i.useCount >= i.maxUses;
                const expired = i.expiresAt ? i.expiresAt < Date.now() : false;
                return (
                  <tr key={i.code} className="align-middle">
                    <td className="p-3 font-mono text-xs">
                      <button
                        type="button"
                        title="복사"
                        onClick={async () => {
                          await navigator.clipboard.writeText(url);
                          setCopied(i.code);
                          setTimeout(() => setCopied(null), 1500);
                        }}
                        className="hover:text-brand-600"
                      >
                        {i.code}
                      </button>
                      {copied === i.code && (
                        <span className="ml-2 text-emerald-600">복사됨</span>
                      )}
                    </td>
                    <td className="p-3">{i.role}</td>
                    <td className="p-3">
                      {i.useCount}/{i.maxUses}
                    </td>
                    <td className="p-3">
                      {i.status === "revoked" ? (
                        <span className="badge bg-slate-100 text-slate-500">
                          회수됨
                        </span>
                      ) : expired ? (
                        <span className="badge bg-amber-100 text-amber-700">
                          만료
                        </span>
                      ) : exhausted ? (
                        <span className="badge bg-slate-100 text-slate-500">
                          소진
                        </span>
                      ) : (
                        <span className="badge bg-emerald-100 text-emerald-700">
                          활성
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">{i.note ?? "—"}</td>
                    <td className="p-3 text-right space-x-2">
                      {i.status === "active" && (
                        <button
                          type="button"
                          className="btn-secondary !py-1 !text-xs"
                          disabled={pending}
                          onClick={() => revoke(i.code)}
                        >
                          회수
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-danger !py-1 !text-xs"
                        disabled={pending}
                        onClick={() => remove(i.code)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
