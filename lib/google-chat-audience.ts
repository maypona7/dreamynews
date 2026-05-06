import "server-only";

/** Chat 설정의 HTTP 엔드포인트 URL과 검증 시 토큰 audience 가 일치해야 함. */
export function resolveGoogleChatAudience(): string | null {
  const explicit = process.env.GOOGLE_CHAT_ENDPOINT_AUDIENCE?.trim();
  if (explicit) {
    try {
      return new URL(explicit).href.replace(/\/$/, "");
    } catch {
      return explicit.replace(/\/$/, "");
    }
  }

  const base = process.env.APP_BASE_URL?.trim();
  if (!base) return null;
  try {
    return new URL("/api/google-chat", base).href.replace(/\/$/, "");
  } catch {
    return null;
  }
}
