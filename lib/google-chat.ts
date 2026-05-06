import "server-only";

import { GoogleAuth } from "google-auth-library";
import { adminDb } from "@/lib/firebase/admin";

const {
  GOOGLE_CHAT_WEBHOOK_URL,
  GOOGLE_CHAT_SPACE_NAME,
  GOOGLE_CHAT_SERVICE_ACCOUNT_JSON,
  APP_BASE_URL = "https://example.com",
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

const CHAT_BOT_SCOPE = "https://www.googleapis.com/auth/chat.bot";

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
  const key = normalized.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  return key.includes("BEGIN PRIVATE KEY") ? key : null;
}

function getServiceAccountCredentials():
  | { client_email: string; private_key: string; project_id?: string }
  | null {
  const raw = GOOGLE_CHAT_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      const j = JSON.parse(raw) as {
        client_email?: string;
        private_key?: string;
        project_id?: string;
      };
      if (j.client_email && j.private_key) {
        return {
          client_email: j.client_email,
          private_key: j.private_key.replace(/\\n/g, "\n"),
          project_id: j.project_id,
        };
      }
    } catch {
      /* ignore */
    }
  }
  const clientEmail = normalizeEnvValue(FIREBASE_CLIENT_EMAIL);
  const privateKey = normalizePrivateKey(FIREBASE_PRIVATE_KEY);
  const projectId = normalizeEnvValue(FIREBASE_PROJECT_ID);
  if (clientEmail && privateKey && projectId) {
    return {
      client_email: clientEmail,
      private_key: privateKey,
      project_id: projectId,
    };
  }
  return null;
}

async function getChatBotAccessToken(): Promise<string> {
  const creds = getServiceAccountCredentials();
  if (!creds) {
    throw new Error(
      "Chat API: GOOGLE_CHAT_SERVICE_ACCOUNT_JSON 또는 Firebase 서비스 계정(FIREBASE_CLIENT_EMAIL·FIREBASE_PRIVATE_KEY·FIREBASE_PROJECT_ID)이 필요합니다.",
    );
  }
  const auth = new GoogleAuth({
    credentials: creds,
    scopes: [CHAT_BOT_SCOPE],
  });
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const token = typeof tokenRes === "string" ? tokenRes : tokenRes?.token;
  if (!token) throw new Error("Chat API: 액세스 토큰을 받지 못했습니다.");
  return token;
}

export async function getGoogleChatSpaceResourceFromStore(): Promise<
  string | null
> {
  const envSpace = GOOGLE_CHAT_SPACE_NAME?.trim();
  if (envSpace) return envSpace;

  const snap = await adminDb().collection("settings").doc("global").get();
  const name = snap.get("googleChatSpaceResource") as string | undefined;
  return typeof name === "string" && name.startsWith("spaces/") ? name : null;
}

export async function setGoogleChatSpaceResourceInStore(
  spaceResource: string | null,
  displayName?: string | null,
): Promise<void> {
  const ref = adminDb().collection("settings").doc("global");
  if (spaceResource && spaceResource.startsWith("spaces/")) {
    await ref.set(
      {
        googleChatSpaceResource: spaceResource,
        ...(displayName != null
          ? { googleChatSpaceDisplayName: displayName }
          : {}),
      },
      { merge: true },
    );
  } else {
    await ref.set(
      { googleChatSpaceResource: null, googleChatSpaceDisplayName: null },
      { merge: true },
    );
  }
}

export async function clearGoogleChatSpaceIfMatches(
  spaceResource: string,
): Promise<void> {
  const current = await getGoogleChatSpaceResourceFromStore();
  if (current === spaceResource) {
    await setGoogleChatSpaceResourceInStore(null);
  }
}

async function sendChatApiMessage(
  spaceResource: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const token = await getChatBotAccessToken();
  const url = `https://chat.googleapis.com/v1/${spaceResource}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Google Chat API failed: ${res.status} ${res.statusText}${errBody ? ` — ${errBody.slice(0, 400)}` : ""}`,
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logoUrlForCard(): string | undefined {
  const custom = process.env.GOOGLE_CHAT_CARD_IMAGE_URL?.trim();
  if (custom) return custom;
  const base = APP_BASE_URL.replace(/\/$/, "");
  if (!base.startsWith("http")) return undefined;
  return `${base}/logo.png`;
}

/** 카드 미리 알림·검색용 짧은 텍스트(Markdown) */
export function formatNewPostGoogleChatMessage(params: {
  title: string;
  excerpt: string;
  postId: string;
  eventAt?: number | null;
}): string {
  const payload = buildNewPostChatPayload(params);
  return typeof payload.text === "string"
    ? payload.text
    : `*소식함* 새 공지: ${params.title}`;
}

export function buildNewPostChatPayload(params: {
  title: string;
  excerpt: string;
  postId: string;
  eventAt?: number | null;
}): Record<string, unknown> {
  const base = APP_BASE_URL.replace(/\/$/, "");
  const postUrl = `${base}/posts/${params.postId}`;
  /** 카드 헤더는 일반 텍스트 전용 — 길이 상한만 둠 */
  const headerPlainTitle = truncate(
    params.title.replace(/\s+/g, " ").trim(),
    200,
  );
  const excerptRaw = truncate(params.excerpt, 520);
  const safeExcerpt = excerptRaw ? escapeHtml(excerptRaw) : "";

  const markdownLine =
    `*소식함* · _새 공지_\n📌 *${params.title.replace(/\*/g, "")}*` +
    (params.eventAt
      ? `\n🗓 행사일: \`${formatDate(params.eventAt)}\``
      : "") +
    `\n🔗 ${postUrl}`;

  const widgets: Record<string, unknown>[] = [];

  if (params.eventAt) {
    widgets.push({
      decoratedText: {
        startIcon: { knownIcon: "CLOCK" },
        topLabel: "행사일",
        text: `<font color="#1e88e5"><b>${escapeHtml(formatDate(params.eventAt))}</b></font>`,
      },
    });
  }

  if (safeExcerpt) {
    widgets.push({ divider: {} });
    widgets.push({
      textParagraph: {
        text: `<font color="#5f6368">${safeExcerpt.replace(/\n/g, "<br>")}</font>`,
      },
    });
  }

  widgets.push({
    buttonList: {
      buttons: [
        {
          text: "공지 보러가기",
          onClick: { openLink: { url: postUrl } },
        },
      ],
    },
  });

  const header: Record<string, unknown> = {
    title: headerPlainTitle,
    subtitle: "소식함 · 새 공지",
  };
  const img = logoUrlForCard();
  if (img) {
    header.imageUrl = img;
    header.imageType = "CIRCLE";
    header.imageAltText = "소식함";
  }

  const cardsV2 = [
    {
      cardId: `new-post-${params.postId}`,
      card: {
        header,
        sections: [
          {
            header: "공지 정보",
            widgets,
          },
        ],
      },
    },
  ];

  return {
    text: markdownLine,
    cardsV2,
  };
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/**
 * 새 글 알림: (1) Chat API — 앱을 스페이스에 추가해 저장된 `spaces/…` 로 전송
 * (2) 없으면 Incoming Webhook URL이 있으면 웹훅으로 전송
 */
export async function sendNewPostGoogleChat(params: {
  title: string;
  excerpt: string;
  postId: string;
  eventAt?: number | null;
}): Promise<void> {
  const payload = buildNewPostChatPayload(params);

  const space = await getGoogleChatSpaceResourceFromStore();
  if (space && getServiceAccountCredentials()) {
    await sendChatApiMessage(space, payload);
    return;
  }

  const webhookUrl = GOOGLE_CHAT_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(
      `Google Chat webhook failed: ${res.status} ${res.statusText}${errBody ? ` — ${errBody.slice(0, 200)}` : ""}`,
    );
  }
}
