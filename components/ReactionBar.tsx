"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth/AuthProvider";
import { subscribeMyReactions } from "@/lib/firebase/queries";
import { DEFAULT_REACTIONS } from "@/lib/types";
import { toggleReactionAction } from "@/app/actions/reactions";

export default function ReactionBar({
  postId,
  counts,
}: {
  postId: string;
  counts: Record<string, number>;
}) {
  const { firebaseUser, isApproved } = useAuth();
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [localCounts, setLocalCounts] = useState<Record<string, number>>(counts);
  const [pendingEmojis, setPendingEmojis] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLocalCounts(counts);
  }, [counts]);

  useEffect(() => {
    if (!firebaseUser) {
      setMine(new Set());
      return;
    }
    return subscribeMyReactions(postId, firebaseUser.uid, (rs) => {
      setMine(new Set(rs.map((r) => r.emoji)));
    });
  }, [firebaseUser, postId]);

  async function toggle(emoji: string) {
    if (!isApproved) return;
    const trimmed = emoji.trim();
    if (!trimmed) return;
    if (pendingEmojis.has(trimmed)) return;
    const wasActive = mine.has(trimmed);

    // Optimistic update: apply immediately for snappier reaction UX.
    setMine((prev) => {
      const next = new Set(prev);
      if (wasActive) next.delete(trimmed);
      else next.add(trimmed);
      return next;
    });
    setLocalCounts((prev) => {
      const current = prev[trimmed] ?? 0;
      const nextValue = Math.max(0, current + (wasActive ? -1 : 1));
      return { ...prev, [trimmed]: nextValue };
    });

    setPendingEmojis((prev) => new Set(prev).add(trimmed));
    try {
      await toggleReactionAction({ postId, emoji: trimmed });
    } catch (e) {
      // Roll back optimistic state on failure.
      setMine((prev) => {
        const next = new Set(prev);
        if (wasActive) next.add(trimmed);
        else next.delete(trimmed);
        return next;
      });
      setLocalCounts((prev) => {
        const current = prev[trimmed] ?? 0;
        const nextValue = Math.max(0, current + (wasActive ? 1 : -1));
        return { ...prev, [trimmed]: nextValue };
      });
      console.error(e);
    } finally {
      setPendingEmojis((prev) => {
        const next = new Set(prev);
        next.delete(trimmed);
        return next;
      });
    }
  }

  return (
    <div className="relative flex items-center gap-2 flex-wrap">
      {DEFAULT_REACTIONS.map((emoji) => {
        const count = localCounts[emoji] ?? 0;
        const active = mine.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            disabled={!isApproved || pendingEmojis.has(emoji)}
            onClick={() => toggle(emoji)}
            className={clsx(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-sm transition-colors",
              active
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-brand-200 bg-white text-brand-700 hover:bg-brand-50",
              !isApproved && "opacity-50 cursor-not-allowed",
            )}
            aria-pressed={active}
            aria-label={`${emoji} ${count}`}
          >
            <span aria-hidden="true">{emoji}</span>
            {count > 0 && <span className="text-xs">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
