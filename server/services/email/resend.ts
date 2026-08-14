import { Resend } from "resend";
import { getApplicationBaseUrl } from "../../config/app-url";
import { getEmailEnv } from "../../config/env";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll(String.fromCharCode(34), "&quot;")
    .replaceAll(String.fromCharCode(39), "&#039;");
}

export async function sendPasswordResetEmail(input: {
  to: string;
  adminName: string;
  token: string;
}): Promise<string> {
  const env = getEmailEnv();
  const resend = new Resend(env.RESEND_API_KEY);
  const resetUrl = `${getApplicationBaseUrl()}/reset-password?token=${encodeURIComponent(input.token)}`;
  const safeName = escapeHtml(input.adminName);
  const safeUrl = escapeHtml(resetUrl);

  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: input.to,
    subject: "[Academy-Gpt] 비밀번호 재설정",
    text: `${input.adminName}님, 아래 주소에서 비밀번호를 재설정해 주세요. 이 링크는 30분 동안 한 번만 사용할 수 있습니다.\n\n${resetUrl}\n\n본인이 요청하지 않았다면 이 메일을 무시해 주세요.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#172033">
        <h1 style="font-size:24px;margin:0 0 20px">비밀번호 재설정</h1>
        <p style="line-height:1.7">${safeName}님, 비밀번호 재설정 요청을 받았습니다.</p>
        <p style="line-height:1.7">아래 버튼을 눌러 새 비밀번호를 설정해 주세요. 이 링크는 30분 동안 한 번만 사용할 수 있습니다.</p>
        <p style="margin:28px 0">
          <a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">
            비밀번호 재설정
          </a>
        </p>
        <p style="line-height:1.7;color:#667085">본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p>
      </div>
    `
  });

  if (error || !data?.id) {
    throw new Error(
      `Resend 발송 실패: ${error?.message ?? "발송 ID가 없습니다."}`
    );
  }

  return data.id;
}
