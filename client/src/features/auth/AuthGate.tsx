import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { AppHeader } from "../../components/layout/AppHeader";
import type { PublicAdmin } from "./api";
import { useCurrentAdmin } from "./useCurrentAdmin";

type AuthGateProps = {
  children: (admin: PublicAdmin) => ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const currentAdmin = useCurrentAdmin();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (currentAdmin.data === null) {
      navigate("/login", { replace: true });
    }
  }, [currentAdmin.data, navigate]);

  if (currentAdmin.isPending || currentAdmin.data === null) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="page page-narrow">
          <section className="content-card loading-state" role="status">
            <span className="spinner" aria-hidden="true" />
            <p>로그인 상태를 확인하고 있습니다.</p>
          </section>
        </main>
      </div>
    );
  }

  if (currentAdmin.isError) {
    return (
      <div className="app-shell">
        <AppHeader />
        <main className="page page-narrow">
          <section className="content-card empty-state">
            <h1>로그인 상태를 확인할 수 없습니다</h1>
            <p>네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
            <button
              type="button"
              className="button button-primary"
              onClick={() => void currentAdmin.refetch()}
            >
              다시 시도
            </button>
          </section>
        </main>
      </div>
    );
  }

  return <>{children(currentAdmin.data)}</>;
}
