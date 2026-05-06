"use server";

import "server-only";
import nodemailer from "nodemailer";

const {
  GMAIL_USER,
  GMAIL_APP_PASSWORD,
  EMAIL_TO = "stu@dreamyedu.net",
  APP_BASE_URL = "https://example.com",
} = process.env;

const transporter =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: GMAIL_USER,
          pass: GMAIL_APP_PASSWORD,
        },
      })
    : null;

export async function sendNewPostEmail(params: {
  title: string;
  excerpt: string;
  postId: string;
  eventAt?: number | null;
}) {
  if (!transporter || !GMAIL_USER) return;
  const url = `${APP_BASE_URL.replace(/\/$/, "")}/posts/${params.postId}`;
  const safeTitle = escapeHtml(params.title);
  const safeExcerpt = escapeHtml(params.excerpt);

  const subject = `[소식함] 새 공지: ${params.title}`;
  const text = [
    `새 공지가 등록되었습니다.\n`,
    `제목: ${params.title}\n`,
    params.eventAt ? `행사일: ${formatDate(params.eventAt)}\n` : "",
    params.excerpt ? `내용 미리보기: ${params.excerpt}\n` : "",
    `자세히 보기: ${url}\n`,
  ]
    .filter(Boolean)
    .join("");

  const html = `
  <div style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans KR',sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:linear-gradient(135deg,#f2fbff,#def4fc);border-bottom:1px solid #e2e8f0;">
                <div style="font-size:13px;font-weight:600;color:#1f7397;letter-spacing:.2px;">소식함</div>
                <h1 style="margin:8px 0 0;font-size:20px;line-height:1.4;color:#0f172a;">새 공지가 등록되었어요</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <div style="display:inline-block;background:#f2fbff;color:#215f7b;font-size:12px;font-weight:600;border:1px solid #bfe8f8;padding:6px 10px;border-radius:999px;">공지 알림</div>
                ${
                  params.eventAt
                    ? `<div style="display:inline-block;margin-left:8px;background:#eff6ff;color:#1e40af;font-size:12px;font-weight:700;border:1px solid #bfdbfe;padding:6px 10px;border-radius:999px;">📅 행사일 ${formatDate(params.eventAt)}</div>`
                    : ""
                }
                <h2 style="margin:14px 0 8px;font-size:22px;line-height:1.35;color:#0f172a;">${safeTitle}</h2>
                ${
                  safeExcerpt
                    ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#475569;">${safeExcerpt}</p>`
                    : ""
                }
                <a href="${url}" style="display:inline-block;background:#1f90bc;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 16px;border-radius:10px;">공지 보러가기</a>
                <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#64748b;">버튼이 동작하지 않으면 아래 링크를 복사해 열어주세요.<br /><a href="${url}" style="color:#1f7397;text-decoration:underline;word-break:break-all;">${url}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;

  await transporter.sendMail({
    from: GMAIL_USER,
    to: EMAIL_TO,
    subject,
    text,
    html,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

