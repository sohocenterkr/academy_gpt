import type { FormEvent } from "react";
import type { AdminRole } from "../../../../shared/permissions";
import type { AdminStatus } from "./api";

type AdminFiltersProps = {
  search: string;
  role: "" | AdminRole;
  status: "" | AdminStatus;
  onSearchChange: (value: string) => void;
  onRoleChange: (value: "" | AdminRole) => void;
  onStatusChange: (value: "" | AdminStatus) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
};

export function AdminFilters({
  search,
  role,
  status,
  onSearchChange,
  onRoleChange,
  onStatusChange,
  onSubmit,
  onReset
}: AdminFiltersProps) {
  return (
    <form className="admin-filters" onSubmit={onSubmit}>
      <label className="field">
        <span>이름·이메일 검색</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          maxLength={100}
          placeholder="검색어 입력"
        />
      </label>

      <label className="field">
        <span>역할</span>
        <select
          value={role}
          onChange={(event) =>
            onRoleChange(event.target.value as "" | AdminRole)
          }
        >
          <option value="">전체 역할</option>
          <option value="super_admin">최고관리자</option>
          <option value="admin">관리자</option>
        </select>
      </label>

      <label className="field">
        <span>상태</span>
        <select
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as "" | AdminStatus)
          }
        >
          <option value="">전체 상태</option>
          <option value="active">활성</option>
          <option value="inactive">비활성</option>
          <option value="locked">잠김</option>
        </select>
      </label>

      <div className="filter-actions">
        <button type="submit" className="button button-primary">
          조회
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={onReset}
        >
          초기화
        </button>
      </div>
    </form>
  );
}
