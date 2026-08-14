import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { AppHeader } from "../../components/layout/AppHeader";
import { ApiError, loginAdmin } from "./api";
import {
  currentAdminQueryKey,
  useCurrentAdmin
} from "./useCurrentAdmin";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const currentAdmin = useCurrentAdmin();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (currentAdmin.data) {
      navigate("/", { replace: true });
    }
  }, [currentAdmin.data, navigate]);

  const login = useMutation({
    mutationFn: loginAdmin,
    onSuccess: (admin) => {
      queryClient.setQueryData(currentAdminQueryKey, admin);
      navigate("/", { replace: true });
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      return;
    }

    login.mutate({
      email: email.trim(),
      password
    });
  }

  const errorMessage =
    login.error instanceof ApiError
      ? login.error.message
      : login.isError
        ? "로그인 중 오류가 발생했습니다."
        : null;

  return (
    <div className="app-shell">
      <AppHeader />

      <main className="page page-narrow">
        <section className="content-card">
          <p className="eyebrow">관리자 전용</p>
          <h1 className="form-title">로그인</h1>
          <p className="form-description">
            등록된 최고관리자 또는 관리자 계정으로 로그인해 주세요.
          </p>

          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>이메일</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={login.isPending}
                required
                autoFocus
              />
            </label>

            <label className="field">
              <span>비밀번호</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="비밀번호를 입력해 주세요"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={login.isPending}
                required
              />
            </label>

            {errorMessage ? (
              <div className="form-error" role="alert">
                {errorMessage}
              </div>
            ) : null}

            <button
              className="button button-primary button-full"
              type="submit"
              disabled={login.isPending || !email.trim() || !password}
            >
              {login.isPending ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="form-footer">
            <Link href="/forgot-password" className="text-link">
              비밀번호를 잊으셨나요?
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
