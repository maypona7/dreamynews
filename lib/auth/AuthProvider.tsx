"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getClientAuth, getDb, googleProvider } from "@/lib/firebase/client";
import { userConverter } from "@/lib/firebase/converters";
import type { AppUser, Role } from "@/lib/types";

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  role: Role | null;
  isApproved: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const auth = getClientAuth();
    const unsub = onIdTokenChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (!u) {
        setAppUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: await u.getIdToken() }),
        });
        if (!res.ok) return;
        /* Firestore rules는 ID 토큰의 custom claims(status/role)를 본다. 세션에서 claims를 맞춘 직후에는
           아직 이전 토큰이므로 한 번 갱신해야 게시글/카테고리 구독이 permission-denied 나지 않음. */
        const tr = await u.getIdTokenResult();
        if (!("status" in tr.claims)) {
          await u.getIdToken(true);
        }
      } catch (e) {
        console.error("session sync failed", e);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      setAppUser(null);
      setLoading(false);
      return;
    }
    const ref = doc(getDb(), "users", firebaseUser.uid).withConverter(
      userConverter,
    );
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setAppUser(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [firebaseUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      appUser,
      loading,
      role: appUser?.role ?? null,
      isApproved: appUser?.status === "approved",
      async signIn() {
        const auth = getClientAuth();
        const provider = googleProvider ?? new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      },
      async signOut() {
        await firebaseSignOut(getClientAuth());
        await fetch("/api/auth/session", { method: "DELETE" });
      },
      async refreshIdToken() {
        if (!firebaseUser) return null;
        return firebaseUser.getIdToken(true);
      },
    }),
    [firebaseUser, appUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
