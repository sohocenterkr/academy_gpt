import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { AppHeader } from "../../components/layout/AppHeader";
import {
  ApiError,
  resetPassword
} from "./api";
import { currentAdminQueryKey } from "./useCurrentAdmin";

export function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const reset = useMutation({
    mutationFn: resetPassword,
    onSuccess: (message) => {
      queryClient.setQueryData(currentAdminQueryKey, null);
      setSuccessMessage(message);
      setPassword("");
      setPasswordConfirmation("");
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(null);

    if (!token) {
      setClientError("재설정 링크가 올바르지 않습니다.");
      return;
    }

    if (password !== passwordConfirmation) {
      setClientError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    reset.mutate({ token, password });
  }

  const serverError =
    reset.error instanceof ApiError
      ? reset.error.message
      : reset.isError
        ? "비밀번호 변경 중 오류가 발생했습니다."
        : null;

  if (!token) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="page page-narrow">
          <section className="content-card empty-state">
            <h1>재설정 링크가 없습니다</h1>
            <p>비밀번호 재설정 이메일을 다시 요청해 주세요.</p>
            <Link href="/forgot-password" className="button button-primary">
              재설정 이메일 요청
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="page page-narrow">
        <section className="content-card">
          <p className="eyebrow">비밀번호 재설정</p>
          <h1 className="form-title">새 비밀번호 설정</h1>
          <p className="form-description">
            다른 사이트에서 사용하지 않은 새 비밀번호를 입력해 주세요.
          </p>

          {successMessage ? (
            <div className="success-panel" role="status">
              <CheckCircle2 size={28} aria-hidden="true" />
              <h2>변경 완료</h2>
              <p>{successMessage}</p>
              <Link href="/login" className="button button-primary">
                새 비밀번호로 로그인
              </Link>
            </div>
          ) : (
            <form className="form-stack" onSubmit={handleSubmit}>
              <label className="field">
                <span>새 비밀번호</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={reset.isPending}
                  required
                  autoFocus
                />
              </label>

              <label className="field">
                <span>새 비밀번호 확인</span>
                <input
                  type="password"
                  name="passwordConfirmation"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) =>
                    setPasswordConfirmation(event.target.value)
                  }
                  disabled={reset.isPending}
                  required
                />
              </label>

              <ul className="password-rules">
                <li>12자 이상</li>
                <li>영문 대문자와 소문자 포함</li>
                <li>숫자와 특수문자 포함</li>
              </ul>

              {clientError || serverError ? (
                <div className="form-error" role="alert">
                  {clientError ?? serverError}
                </div>
              ) : null}

              <button
                type="submit"
                className="button button-primary button-full"
                disabled={
                  reset.isPending ||
                  !password ||
                  !passwordConfirmation
                }
              >
                {reset.isPending ? "변경 중..." : "비밀번호 변경"}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
