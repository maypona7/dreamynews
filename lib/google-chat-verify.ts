import "server-only";

import { OAuth2Client } from "google-auth-library";

const CHAT_ISSUER_EMAIL = "chat@system.gserviceaccount.com";

/**
 * Google Chat이 보낸 HTTP 요청인지 검증합니다 (Authentication audience = HTTP endpoint URL).
 * @see https://developers.google.com/workspace/chat/verify-requests-from-chat
 */
export async function verifyGoogleChatBearerToken(
  authorizationHeader: string | null,
  audience: string,
): Promise<boolean> {
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const token = authorizationHeader.slice(7).trim();
  if (!token) return false;
  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience,
    });
    const payload = ticket.getPayload();
    return (
      payload?.email === CHAT_ISSUER_EMAIL && payload?.email_verified === true
    );
  } catch {
    return false;
  }
}
