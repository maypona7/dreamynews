"use client";

import { useState, useTransition } from "react";
import { updateSettingsAction } from "@/app/actions/settings";
import type { AppSettings } from "@/lib/types";

export default function SettingsClient({ initial }: { initial: AppSettings }) {
  const [settings, setSettings] = useState<AppSettings>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateSettingsAction(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장 실패");
      }
    });
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            사이트 이름
          </label>
          <input
            type="text"
            className="input"
            value={settings.siteName}
            onChange={(e) =>
              setSettings({ ...settings, siteName: e.target.value })
            }
            maxLength={100}
          />
        </div>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="w-4 h-4 mt-1"
            checked={settings.autoApprove}
            onChange={(e) =>
              setSettings({ ...settings, autoApprove: e.target.checked })
            }
          />
          <span>
            <span className="block text-sm font-medium text-slate-800">
              자동 승인
            </span>
            <span className="block text-xs text-slate-500 mt-1">
              켜면 Google 로그인 후 곧바로 viewer 권한이 부여됩니다. 끄면 관리자
              승인 전까지 대기 상태로 남습니다.
            </span>
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={save}
        >
          저장
        </button>
        {saved && (
          <span className="text-sm text-emerald-600">저장되었습니다</span>
        )}
        {error && (
          <span className="text-sm text-red-600" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
