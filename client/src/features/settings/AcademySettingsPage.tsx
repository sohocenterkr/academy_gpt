import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { ArrowLeft, Building2, ShieldAlert } from "lucide-react";
import { Link, useLocation } from "wouter";
import { hasPermission } from "../../../../shared/permissions";
import { AppHeader } from "../../components/layout/AppHeader";
import {
  logoutAdmin,
  type PublicAdmin
} from "../auth/api";
import { currentAdminQueryKey } from "../auth/useCurrentAdmin";
import {
  getAcademySettings,
  updateAcademySettings,
  type AcademySettingsItem
} from "./academy-api";
import { AcademySettingsForm } from "./AcademySettingsForm";

type AcademySettingsPageProps = {
  admin: PublicAdmin;
};

const academySettingsQueryKey = ["academy-settings"] as const;

export function AcademySettingsPage({
  admin
}: AcademySettingsPageProps) {
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const settings = useQuery({
    queryKey: academySettingsQueryKey,
    queryFn: getAcademySettings
  });

  const saveSettings = useMutation({
    mutationFn: updateAcademySettings,
    onMutate: () => {
      setSavedMessage(null);
    },
    onSuccess: (saved: AcademySettingsItem) => {
      queryClient.setQueryData(academySettingsQueryKey, saved);
      setSavedMessage("학원 기본정보를 저장했습니다.");
    }
  });

  const logout = useMutation({
    mutationFn: logoutAdmin,
    onSuccess: () => {
      queryClient.setQueryData(currentAdminQueryKey, null);
      navigate("/login", { replace: true });
    }
  });

  if (!hasPermission(admin.role, "settings:view")) {
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
            <p>학원 기본정보를 조회할 권한이 없습니다.</p>
            <Link href="/" className="button button-primary">
              대시보드로 이동
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const canManage = hasPermission(admin.role, "settings:manage");

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
                <h1 className="page-title">학원 기본정보</h1>
                <p className="page-description">
                  학원명, 대표 연락처와 브랜드 기본값을 관리합니다.
                </p>
              </div>

              <Link href="/" className="button button-secondary">
                <ArrowLeft size={18} aria-hidden="true" />
                대시보드
              </Link>
            </div>
          </section>

          <section className="content-card academy-settings-card">
            {settings.isPending ? (
              <div className="reference-state">
                학원 기본정보를 불러오는 중입니다.
              </div>
            ) : null}

            {settings.isError ? (
              <div className="settings-load-error">
                <Building2 size={30} aria-hidden="true" />
                <strong>기본정보를 불러올 수 없습니다</strong>
                <p>
                  {settings.error instanceof Error
                    ? settings.error.message
                    : "잠시 후 다시 시도해 주세요."}
                </p>
              </div>
            ) : null}

            {settings.isSuccess ? (
              <AcademySettingsForm
                settings={settings.data}
                canManage={canManage}
                isSaving={saveSettings.isPending}
                errorMessage={
                  saveSettings.isError &&
                  saveSettings.error instanceof Error
                    ? saveSettings.error.message
                    : null
                }
                savedMessage={savedMessage}
                onSubmit={(input) => saveSettings.mutate(input)}
              />
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
