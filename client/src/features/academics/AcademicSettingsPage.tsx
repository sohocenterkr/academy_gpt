import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Layers3,
  School,
  ShieldAlert
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { hasPermission } from "../../../../shared/permissions";
import { AppHeader } from "../../components/layout/AppHeader";
import {
  logoutAdmin,
  type PublicAdmin
} from "../auth/api";
import { currentAdminQueryKey } from "../auth/useCurrentAdmin";
import { GradeLevelManager } from "./GradeLevelManager";
import { SchoolManager } from "./SchoolManager";

type AcademicSettingsPageProps = {
  admin: PublicAdmin;
};

type AcademicTab = "schools" | "grades";

export function AcademicSettingsPage({
  admin
}: AcademicSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<AcademicTab>("schools");
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const logout = useMutation({
    mutationFn: logoutAdmin,
    onSuccess: () => {
      queryClient.setQueryData(currentAdminQueryKey, null);
      navigate("/login", { replace: true });
    }
  });

  if (!hasPermission(admin.role, "academics:view")) {
    return (
      <div className="app-shell">
        <AppHeader
          admin={admin}
          isLoggingOut={logout.isPending}
          onLogout={() => logout.mutate()}
        />
        <main className="page page-narrow">
          <section className="content-card empty-state">
            <ShieldAlert size={30} aria-hidden="true" />
            <h1>접근 권한이 없습니다</h1>
            <p>학사 기준정보를 조회할 권한이 없습니다.</p>
            <Link href="/" className="button button-primary">
              대시보드로 이동
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const canManage = hasPermission(admin.role, "academics:manage");

  return (
    <div className="app-shell">
      <AppHeader
        admin={admin}
        isLoggingOut={logout.isPending}
        onLogout={() => logout.mutate()}
      />

      <main className="page">
        <div className="page-stack">
          <section className="content-card">
            <div className="page-title-row">
              <div>
                <p className="eyebrow">학원 운영 설정</p>
                <h1 className="page-title">학사 기준정보</h1>
                <p className="page-description">
                  학생 등록에 사용할 학교와 학년 목록을 관리합니다.
                </p>
              </div>

              <Link href="/" className="button button-secondary">
                <ArrowLeft size={18} aria-hidden="true" />
                대시보드
              </Link>
            </div>
          </section>

          <section className="content-card academics-panel">
            <div className="settings-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "schools"}
                className={
                  activeTab === "schools"
                    ? "settings-tab is-active"
                    : "settings-tab"
                }
                onClick={() => setActiveTab("schools")}
              >
                <School size={18} aria-hidden="true" />
                학교
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "grades"}
                className={
                  activeTab === "grades"
                    ? "settings-tab is-active"
                    : "settings-tab"
                }
                onClick={() => setActiveTab("grades")}
              >
                <Layers3 size={18} aria-hidden="true" />
                학년
              </button>
            </div>

            {activeTab === "schools" ? (
              <SchoolManager canManage={canManage} />
            ) : (
              <GradeLevelManager canManage={canManage} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
