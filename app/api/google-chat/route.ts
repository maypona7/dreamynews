import { NextResponse } from "next/server";
import { resolveGoogleChatAudience } from "@/lib/google-chat-audience";
import { verifyGoogleChatBearerToken } from "@/lib/google-chat-verify";
import {
  clearGoogleChatSpaceIfMatches,
  setGoogleChatSpaceResourceInStore,
} from "@/lib/google-chat";

export const runtime = "nodejs";

/** GCP 구성 저장·헬스체크 시 연결 확인용 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "dreamy-news-google-chat",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: "GET, POST, OPTIONS" },
  });
}

function eventKind(body: Record<string, unknown>): string {
  const k = body.eventType ?? body.type;
  return typeof k === "string" ? k : "";
}

function spaceFromEvent(body: Record<string, unknown>): {
  name?: string;
  displayName?: string;
} | null {
  const s = body.space;
  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name : undefined;
  const displayName =
    typeof o.displayName === "string" ? o.displayName : undefined;
  if (!name) return null;
  return { name, displayName };
}

function messageText(body: Record<string, unknown>): string {
  const m = body.message;
  if (!m || typeof m !== "object") return "";
  const o = m as Record<string, unknown>;
  const arg = typeof o.argumentText === "string" ? o.argumentText.trim() : "";
  if (arg) return arg;
  const text = typeof o.text === "string" ? o.text.trim() : "";
  return text;
}

const HELP_TEXT = [
  "안녕하세요, *소식함* 알림 봇입니다.",
  "",
  "• 이 스페이스에 봇을 추가해 두면 새 공지가 올라올 때 여기로 알림이 전달됩니다.",
  "• 웹에서 글을 쓰면 자동으로 메시지가 옵니다.",
  "",
  "도움말이 필요하면 관리자에게 문의하세요.",
].join("\n");

/**
 * Google Cloud → Chat 앱 HTTP 엔드포인트.
 *
 * 검증용 audience(GOOGLE_CHAT_ENDPOINT_AUDIENCE)가 없으면 `APP_BASE_URL` 로부터
 * `…/api/google-chat` 을 추론합니다. Chat 콘솔의 엔드포인트 URL과 반드시 같아야 합니다.
 */
export async function POST(req: Request) {
  const audience = resolveGoogleChatAudience();
  const skipVerify = process.env.GOOGLE_CHAT_SKIP_VERIFY === "true";

  if (!skipVerify) {
    if (!audience) {
      console.error(
        "Chat audience 불가: GOOGLE_CHAT_ENDPOINT_AUDIENCE 또는 APP_BASE_URL 을 설정하세요.",
      );
      return NextResponse.json({ error: "misconfigured" }, { status: 503 });
    }
    const ok = await verifyGoogleChatBearerToken(
      req.headers.get("authorization"),
      audience,
    );
    if (!ok) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const rawBody = await req.text();
  let body: Record<string, unknown> = {};
  if (rawBody.trim()) {
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }
  }

  const kind = eventKind(body);

  switch (kind) {
    case "ADDED_TO_SPACE": {
      const sp = spaceFromEvent(body);
      if (sp?.name?.startsWith("spaces/")) {
        await setGoogleChatSpaceResourceInStore(sp.name, sp.displayName ?? null);
      }
      return NextResponse.json({
        text:
          "소식함 봇이 이 대화에 연결되었습니다. 웹에서 새 공지를 올리면 이곳으로 알림이 전달됩니다.\n\n" +
          "• `/help` 또는 “도움말”로 안내를 다시 볼 수 있어요.",
      });
    }
    case "REMOVED_FROM_SPACE": {
      const sp = spaceFromEvent(body);
      if (sp?.name) await clearGoogleChatSpaceIfMatches(sp.name);
      return NextResponse.json({});
    }
    case "MESSAGE":
    case "APP_COMMAND": {
      const raw = messageText(body).toLowerCase();
      if (
        raw === "/help" ||
        raw === "help" ||
        raw.includes("도움") ||
        raw.startsWith("/about")
      ) {
        return NextResponse.json({ text: HELP_TEXT });
      }
      return NextResponse.json({});
    }
    default:
      return NextResponse.json({});
  }
}
