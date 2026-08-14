import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { AppHeader } from "../../components/layout/AppHeader";
import {
  ApiError,
  requestPasswordReset
} from "./api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const requestReset = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: (message) => {
      setSentMessage(message);
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      return;
    }

    requestReset.mutate(email.trim());
  }

  const errorMessage =
    requestReset.error instanceof ApiError
      ? requestReset.error.message
      : requestReset.isError
        ? "재설정 이메일 요청 중 오류가 발생했습니다."
        : null;

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="page page-narrow">
        <section className="content-card">
          <p className="eyebrow">비밀번호 재설정</p>
          <h1 className="form-title">이메일 확인</h1>
          <p className="form-description">
            등록된 관리자 이메일을 입력하면 30분 동안 사용할 수 있는
            재설정 링크를 보내드립니다.
          </p>

          {sentMessage ? (
            <div className="success-panel" role="status">
              <CheckCircle2 size={28} aria-hidden="true" />
              <h2>이메일을 확인해 주세요</h2>
              <p>{sentMessage}</p>
              <p>받은편지함에 없다면 스팸함도 확인해 주세요.</p>
            </div>
          ) : (
            <form className="form-stack" onSubmit={handleSubmit}>
              <label className="field">
                <span>관리자 이메일</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={requestReset.isPending}
                  required
                  autoFocus
                />
              </label>

              {errorMessage ? (
                <div className="form-error" role="alert">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                className="button button-primary button-full"
                disabled={requestReset.isPending || !email.trim()}
              >
                {requestReset.isPending
                  ? "이메일 발송 중..."
                  : "재설정 이메일 보내기"}
              </button>
            </form>
          )}

          <div className="form-footer">
            <Link href="/login" className="text-link">
              로그인으로 돌아가기
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
