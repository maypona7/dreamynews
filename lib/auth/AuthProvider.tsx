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
        await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: await u.getIdToken() }),
        });
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
