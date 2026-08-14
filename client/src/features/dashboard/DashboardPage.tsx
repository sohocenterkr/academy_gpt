import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  GraduationCap,
  MessageSquareText,
  Newspaper,
  Settings2,
  ShieldCheck,
  Users
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { hasPermission } from "../../../../shared/permissions";
import { AppHeader } from "../../components/layout/AppHeader";
import {
  logoutAdmin,
  type PublicAdmin
} from "../auth/api";
import { currentAdminQueryKey } from "../auth/useCurrentAdmin";

type HealthResponse = {
  status: string;
  service: string;
  timezone: string;
  timestamp: string;
};

async function getHealth(): Promise<HealthResponse> {
  const response = await fetch("/api/health");

  if (!response.ok) {
    throw new Error("서버 상태를 확인할 수 없습니다.");
  }

  return response.json() as Promise<HealthResponse>;
}

type DashboardPageProps = {
  admin: PublicAdmin;
};

export function DashboardPage({ admin }: DashboardPageProps) {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const health = useQuery({
    queryKey: ["health"],
    queryFn: getHealth
  });

  const logout = useMutation({
    mutationFn: logoutAdmin,
    onSuccess: () => {
      queryClient.setQueryData(currentAdminQueryKey, null);
      navigate("/login", { replace: true });
    }
  });

  return (
    <div className="app-shell">
      <AppHeader
        admin={admin}
        isLoggingOut={logout.isPending}
        onLogout={() => logout.mutate()}
      />

      <main className="page">
        <div className="page-stack">
          <section className="content-card hero">
            <p className="eyebrow">학원 업무자동화</p>
            <h1>{admin.name}님, 안녕하세요</h1>
            <p className="hero-description">
              학생 관리부터 등원, 대량문자와 카드뉴스까지 한곳에서
              관리합니다.
            </p>

            <div
              className={[
                "health-status",
                health.isError ? "is-error" : "",
                health.isSuccess ? "is-success" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              role="status"
            >
              <Activity size={18} aria-hidden="true" />
              {health.isPending && "서버 연결 확인 중"}
              {health.isSuccess && "개발 서버 정상 연결"}
              {health.isError && "개발 서버 연결 실패"}
            </div>

            {logout.isError ? (
              <div className="inline-error" role="alert">
                로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.
              </div>
            ) : null}
          </section>

          <section className="content-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">구현 예정 기능</p>
                <h2>주요 업무</h2>
              </div>
            </div>

            <div className="feature-grid">
              <article className="feature-item">
                <Users size={22} aria-hidden="true" />
                <h3>학생·보호자</h3>
                <p>학생 정보와 보호자 관계, 수신 동의를 관리합니다.</p>
              </article>

              <article className="feature-item">
                <GraduationCap size={22} aria-hidden="true" />
                <h3>등원 관리</h3>
                <p>전화번호 뒤 4자리로 빠르게 등원을 기록합니다.</p>
              </article>

              <article className="feature-item">
                <MessageSquareText size={22} aria-hidden="true" />
                <h3>대량문자</h3>
                <p>대상 검토 후 개인화 문자를 예약 발송합니다.</p>
              </article>

              <article className="feature-item">
                <Newspaper size={22} aria-hidden="true" />
                <h3>카드뉴스</h3>
                <p>사진과 사연으로 홍보용 카드뉴스를 제작합니다.</p>
              </article>
            </div>
          </section>

          {hasPermission(admin.role, "academics:view") ? (
            <section className="content-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">운영 기준</p>
                  <h2>학원 설정</h2>
                </div>
              </div>

              <Link
                href="/admin/settings/academics"
                className="admin-tool-link"
              >
                <span className="admin-tool-icon" aria-hidden="true">
                  <Settings2 size={24} />
                </span>
                <span>
                  <strong>학교·학년 관리</strong>
                  <small>
                    학생 등록에 사용할 학교와 학년 목록을 관리합니다.
                  </small>
                </span>
              </Link>

              <Link
                href="/admin/settings/academy"
                className="admin-tool-link"
              >
                <span className="admin-tool-icon" aria-hidden="true">
                  <Building2 size={24} />
                </span>
                <span>
                  <strong>학원 기본정보</strong>
                  <small>
                    학원명, 연락처와 브랜드 기본값을 관리합니다.
                  </small>
                </span>
              </Link>
            </section>
          ) : null}

          {hasPermission(admin.role, "audit:view") ? (
            <section className="content-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">최고관리자 전용</p>
                  <h2>운영 관리</h2>
                </div>
              </div>

              <Link href="/audit-logs" className="admin-tool-link">
                <span className="admin-tool-icon" aria-hidden="true">
                  <ShieldCheck size={24} />
                </span>
                <span>
                  <strong>감사기록</strong>
                  <small>
                    로그인과 비밀번호 변경 등 관리자 활동을 확인합니다.
                  </small>
                </span>
              </Link>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
