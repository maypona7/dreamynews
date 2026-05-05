import "server-only";
import { createPrivateKey } from "node:crypto";

import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

let adminAppInstance: App | null = null;

function normalizeEnvValue(value?: string): string | null {
  if (!value) return null;
  let normalized = value.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1);
  }
  return normalized || null;
}

function normalizePrivateKey(value?: string): string | null {
  const normalized = normalizeEnvValue(value);
  if (!normalized) return null;
  let key = normalized;
  key = key.replace(/\\n/g, "\n");
  key = key.replace(/\r\n/g, "\n");
  return key.includes("BEGIN PRIVATE KEY") ? key : null;
}

function buildCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = normalizeEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if ((projectId || clientEmail || process.env.FIREBASE_PRIVATE_KEY) && !privateKey) {
    throw new Error(
      "Invalid FIREBASE_PRIVATE_KEY format. Use one-line key with \\n escapes or a quoted multiline PEM.",
    );
  }

  if (privateKey) {
    try {
      createPrivateKey({ key: privateKey, format: "pem" });
    } catch {
      throw new Error(
        "FIREBASE_PRIVATE_KEY is not a valid PEM private key. Re-copy `private_key` from service account JSON and keep line breaks as \\n.",
      );
    }
  }

  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }

  return applicationDefault();
}

export function getAdminApp(): App {
  if (adminAppInstance) return adminAppInstance;
  if (getApps().length) {
    adminAppInstance = getApp();
    return adminAppInstance;
  }
  adminAppInstance = initializeApp({
    credential: buildCredential(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return adminAppInstance;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function adminStorage(): Storage {
  return getStorage(getAdminApp());
}
