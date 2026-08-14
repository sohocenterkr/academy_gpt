import { Link, Route, Switch } from "wouter";
import { AppHeader } from "./components/layout/AppHeader";
import { AuthGate } from "./features/auth/AuthGate";
import { LoginPage } from "./features/auth/LoginPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";

function ForgotPasswordPage() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="page page-narrow">
        <section className="content-card empty-state">
          <p className="eyebrow">비밀번호 재설정</p>
          <h1>이메일 재설정 기능 준비 중</h1>
          <p>다음 단계에서 Resend 이메일 재설정을 연결합니다.</p>
          <Link href="/login" className="button button-primary">
            로그인으로 돌아가기
          </Link>
        </section>
      </main>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="page page-narrow">
        <section className="content-card empty-state">
          <h1>페이지를 찾을 수 없습니다</h1>
          <p>주소를 확인하거나 로그인 화면으로 이동해 주세요.</p>
          <Link href="/login" className="button button-primary">
            로그인으로 이동
          </Link>
        </section>
      </main>
    </div>
  );
}

function ProtectedDashboard() {
  return (
    <AuthGate>
      {(admin) => <DashboardPage admin={admin} />}
    </AuthGate>
  );
}

export function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={ProtectedDashboard} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
