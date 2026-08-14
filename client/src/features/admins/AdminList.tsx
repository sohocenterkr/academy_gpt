import { KeyRound, Pencil, ScrollText, Users } from "lucide-react";
import { Link } from "wouter";
import type { AdminItem } from "./api";

type AdminListProps = {
  items: AdminItem[];
  currentAdminId: string;
  isMutating: boolean;
  onEdit: (admin: AdminItem) => void;
  onSendReset: (admin: AdminItem) => void;
};

const roleLabels = {
  super_admin: "최고관리자",
  admin: "관리자"
} as const;

const statusLabels = {
  active: "활성",
  inactive: "비활성",
  locked: "잠김"
} as const;

function formatKst(value: string | null): string {
  if (!value) {
    return "기록 없음";
  }

  return `${value.replace("T", " ").replace("+09:00", "").slice(0, 19)} KST`;
}

export function AdminList({
  items,
  currentAdminId,
  isMutating,
  onEdit,
  onSendReset
}: AdminListProps) {
  if (items.length === 0) {
    return (
      <div className="reference-empty">
        <Users size={30} aria-hidden="true" />
        <strong>조건에 맞는 관리자가 없습니다</strong>
        <p>검색어나 필터를 변경해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="admin-list">
      {items.map((admin) => (
        <article className="admin-record" key={admin.id}>
          <div className="admin-record-main">
            <div>
              <strong>{admin.name}</strong>
              {admin.id === currentAdminId ? (
                <span className="current-account-badge">현재 계정</span>
              ) : null}
            </div>
            <span>{admin.email}</span>
          </div>

          <div className="admin-record-field">
            <small>역할</small>
            <strong>{roleLabels[admin.role]}</strong>
          </div>

          <div className="admin-record-field">
            <small>상태</small>
            <span className={`status-badge is-${admin.status}`}>
              {statusLabels[admin.status]}
            </span>
          </div>

          <div className="admin-record-field">
            <small>최근 로그인</small>
            <span>{formatKst(admin.lastLoginAt)}</span>
          </div>

          <div className="admin-record-actions">
            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => onEdit(admin)}
              disabled={isMutating}
            >
              <Pencil size={16} aria-hidden="true" />
              수정
            </button>

            <button
              type="button"
              className="button button-secondary button-small"
              onClick={() => onSendReset(admin)}
              disabled={isMutating || admin.status === "inactive"}
            >
              <KeyRound size={16} aria-hidden="true" />
              재설정 메일
            </button>

            <Link
              href={`/audit-logs?entityId=${admin.id}`}
              className="button button-secondary button-small"
            >
              <ScrollText size={16} aria-hidden="true" />
              활동
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
