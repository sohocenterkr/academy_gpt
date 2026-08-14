import { Link, Route, Switch } from "wouter";
import { AppHeader } from "./components/layout/AppHeader";
import { AcademicSettingsPage } from "./features/academics/AcademicSettingsPage";
import { AcademySettingsPage } from "./features/settings/AcademySettingsPage";
import { AdminsPage } from "./features/admins/AdminsPage";
import { AuditLogsPage } from "./features/audit/AuditLogsPage";
import { AuthGate } from "./features/auth/AuthGate";
import { ForgotPasswordPage } from "./features/auth/ForgotPasswordPage";
import { LoginPage } from "./features/auth/LoginPage";
import { ResetPasswordPage } from "./features/auth/ResetPasswordPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";

function ProtectedAdmins() {
  return (
    <AuthGate>
      {(admin) => <AdminsPage admin={admin} />}
    </AuthGate>
  );
}

function ProtectedAcademySettings() {
  return (
    <AuthGate>
      {(admin) => <AcademySettingsPage admin={admin} />}
    </AuthGate>
  );
}

function ProtectedAcademicSettings() {
  return (
    <AuthGate>
      {(admin) => <AcademicSettingsPage admin={admin} />}
    </AuthGate>
  );
}

function ProtectedAuditLogs() {
  return (
    <AuthGate>
      {(admin) => <AuditLogsPage admin={admin} />}
    </AuthGate>
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
      <Route
        path="/admin/settings/admins"
        component={ProtectedAdmins}
      />
      <Route
        path="/admin/settings/academy"
        component={ProtectedAcademySettings}
      />
      <Route
        path="/admin/settings/academics"
        component={ProtectedAcademicSettings}
      />
      <Route path="/audit-logs" component={ProtectedAuditLogs} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
