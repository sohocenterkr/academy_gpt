import { useState, type FormEvent } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { ArrowLeft, FileSearch, ShieldAlert } from "lucide-react";
import { Link, useLocation } from "wouter";
import { hasPermission } from "../../../../shared/permissions";
import { AppHeader } from "../../components/layout/AppHeader";
import {
  logoutAdmin,
  type PublicAdmin
} from "../auth/api";
import { currentAdminQueryKey } from "../auth/useCurrentAdmin";
import {
  getAuditLogs,
  type AuditLogQuery
} from "./api";

const actionLabels: Record<string, string> = {
  ADMIN_BOOTSTRAPPED: "최고관리자 최초 생성",
  ADMIN_LOGIN_SUCCEEDED: "관리자 로그인 성공",
  ADMIN_LOGIN_FAILED: "관리자 로그인 실패",
  ADMIN_LOGIN_BLOCKED: "잠긴 계정 로그인 차단",
  ADMIN_LOGOUT: "관리자 로그아웃",
  PASSWORD_RESET_EMAIL_SENT: "재설정 이메일 발송",
  PASSWORD_RESET_EMAIL_FAILED: "재설정 이메일 발송 실패",
  PASSWORD_RESET_SUCCEEDED: "비밀번호 재설정 완료"
};

const actionOptions = Object.entries(actionLabels);

function formatKstTimestamp(value: string): string {
  return `${value.replace("T", " ").replace("+09:00", "").slice(0, 19)} KST`;
}

type AuditLogsPageProps = {
  admin: PublicAdmin;
};

export function AuditLogsPage({ admin }: AuditLogsPageProps) {
  const [draftAction, setDraftAction] = useState("");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [query, setQuery] = useState<AuditLogQuery>({
    page: 1,
    pageSize: 20
  });
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const logs = useQuery({
    queryKey: ["audit-logs", query],
    queryFn: () => getAuditLogs(query),
    placeholderData: keepPreviousData
  });

  const logout = useMutation({
    mutationFn: logoutAdmin,
    onSuccess: () => {
      queryClient.setQueryData(currentAdminQueryKey, null);
      navigate("/login", { replace: true });
    }
  });

  if (!hasPermission(admin.role, "audit:view")) {
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
            <p>감사기록은 최고관리자만 조회할 수 있습니다.</p>
            <Link href="/" className="button button-primary">
              대시보드로 이동
            </Link>
          </section>
        </main>
      </div>
    );
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setQuery({
      page: 1,
      pageSize: 20,
      action: draftAction || undefined,
      dateFrom: draftDateFrom || undefined,
      dateTo: draftDateTo || undefined
    });
  }

  function resetFilters() {
    setDraftAction("");
    setDraftDateFrom("");
    setDraftDateTo("");
    setQuery({ page: 1, pageSize: 20 });
  }

  const pagination = logs.data?.pagination;

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
                <p className="eyebrow">최고관리자 전용</p>
                <h1 className="page-title">감사기록</h1>
                <p className="page-description">
                  로그인, 비밀번호 변경과 주요 관리자 작업을 KST 기준으로
                  확인합니다.
                </p>
              </div>

              <Link href="/" className="button button-secondary">
                <ArrowLeft size={18} aria-hidden="true" />
                대시보드
              </Link>
            </div>
          </section>

          <section className="content-card">
            <form className="audit-filters" onSubmit={applyFilters}>
              <label className="field">
                <span>작업 유형</span>
                <select
                  value={draftAction}
                  onChange={(event) => setDraftAction(event.target.value)}
                >
                  <option value="">전체 작업</option>
                  {actionOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>시작일</span>
                <input
                  type="date"
                  value={draftDateFrom}
                  onChange={(event) => setDraftDateFrom(event.target.value)}
                />
              </label>

              <label className="field">
                <span>종료일</span>
                <input
                  type="date"
                  value={draftDateTo}
                  onChange={(event) => setDraftDateTo(event.target.value)}
                />
              </label>

              <div className="filter-actions">
                <button type="submit" className="button button-primary">
                  조회
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={resetFilters}
                >
                  초기화
                </button>
              </div>
            </form>
          </section>

          <section className="content-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">관리자 활동</p>
                <h2>기록 목록</h2>
              </div>
              <span className="record-count">
                총 {pagination?.total ?? 0}건
              </span>
            </div>

            {logs.isPending ? (
              <div className="loading-state" role="status">
                <span className="spinner" aria-hidden="true" />
                <p>감사기록을 불러오고 있습니다.</p>
              </div>
            ) : logs.isError ? (
              <div className="empty-state">
                <FileSearch size={30} aria-hidden="true" />
                <h3>기록을 불러오지 못했습니다</h3>
                <p>{logs.error.message}</p>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => void logs.refetch()}
                >
                  다시 시도
                </button>
              </div>
            ) : logs.data.items.length === 0 ? (
              <div className="empty-state">
                <FileSearch size={30} aria-hidden="true" />
                <h3>조건에 맞는 기록이 없습니다</h3>
                <p>필터를 변경하거나 초기화해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="audit-list">
                  <div className="audit-list-header" aria-hidden="true">
                    <span>작업</span>
                    <span>관리자</span>
                    <span>대상</span>
                    <span>작업시각</span>
                  </div>

                  {logs.data.items.map((item) => (
                    <article className="audit-record" key={item.id}>
                      <div className="audit-record-summary">
                        <div>
                          <span className="mobile-field-label">작업</span>
                          <strong>
                            {actionLabels[item.action] ?? item.action}
                          </strong>
                        </div>
                        <div>
                          <span className="mobile-field-label">관리자</span>
                          <span>
                            {item.actorName ?? "시스템"}
                            {item.actorEmail ? (
                              <small>{item.actorEmail}</small>
                            ) : null}
                          </span>
                        </div>
                        <div>
                          <span className="mobile-field-label">대상</span>
                          <span>
                            {item.entityType}
                            {item.entityId ? (
                              <small>{item.entityId}</small>
                            ) : null}
                          </span>
                        </div>
                        <div>
                          <span className="mobile-field-label">작업시각</span>
                          <time dateTime={item.createdAt}>
                            {formatKstTimestamp(item.createdAt)}
                          </time>
                        </div>
                      </div>

                      <details className="audit-details">
                        <summary>상세정보</summary>
                        <dl>
                          <div>
                            <dt>IP</dt>
                            <dd>{item.ipAddress ?? "기록 없음"}</dd>
                          </div>
                          <div>
                            <dt>브라우저</dt>
                            <dd>{item.userAgent ?? "기록 없음"}</dd>
                          </div>
                        </dl>
                        <pre>
                          {JSON.stringify(item.metadata, null, 2)}
                        </pre>
                      </details>
                    </article>
                  ))}
                </div>

                <nav className="pagination" aria-label="감사기록 페이지">
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={(pagination?.page ?? 1) <= 1}
                    onClick={() =>
                      setQuery((current) => ({
                        ...current,
                        page: current.page - 1
                      }))
                    }
                  >
                    이전
                  </button>
                  <span>
                    {pagination?.page ?? 1} / {pagination?.totalPages || 1}
                  </span>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={
                      (pagination?.page ?? 1) >=
                      (pagination?.totalPages || 1)
                    }
                    onClick={() =>
                      setQuery((current) => ({
                        ...current,
                        page: current.page + 1
                      }))
                    }
                  >
                    다음
                  </button>
                </nav>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
