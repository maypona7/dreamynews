"use client";

import { useEffect, useState } from "react";

const KEY = "dn:read-posts";

type ReadMap = Record<string, number>;

function readAll(): ReadMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ReadMap;
    return {};
  } catch {
    return {};
  }
}

function writeAll(map: ReadMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
    window.dispatchEvent(new Event("dn:read-changed"));
  } catch {
    // ignore quota errors
  }
}

export function markPostRead(postId: string, ts: number = Date.now()) {
  const map = readAll();
  map[postId] = ts;
  writeAll(map);
}

export function isPostUnread(postId: string, postUpdatedAt: number): boolean {
  const map = readAll();
  const lastRead = map[postId];
  if (!lastRead) return true;
  return postUpdatedAt > lastRead;
}

export function useReadMap(): ReadMap {
  const [map, setMap] = useState<ReadMap>({});
  useEffect(() => {
    setMap(readAll());
    function update() {
      setMap(readAll());
    }
    window.addEventListener("dn:read-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("dn:read-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return map;
}
