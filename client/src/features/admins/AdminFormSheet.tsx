import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { AdminRole } from "../../../../shared/permissions";
import type {
  AdminCreateInput,
  AdminItem,
  AdminUpdateInput
} from "./api";

type AdminFormSheetProps = {
  admin: AdminItem | null;
  isSaving: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onCreate: (input: AdminCreateInput) => void;
  onUpdate: (input: AdminUpdateInput) => void;
};

export function AdminFormSheet({
  admin,
  isSaving,
  errorMessage,
  onClose,
  onCreate,
  onUpdate
}: AdminFormSheetProps) {
  const [email, setEmail] = useState(admin?.email ?? "");
  const [name, setName] = useState(admin?.name ?? "");
  const [role, setRole] = useState<AdminRole>(
    admin?.role ?? "admin"
  );
  const [status, setStatus] = useState<"active" | "inactive">(
    admin?.status === "inactive" ? "inactive" : "active"
  );
  const [localError, setLocalError] = useState<string | null>(null);

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setLocalError("관리자 이름을 입력해 주세요.");
      return;
    }

    if (!admin && !email.trim()) {
      setLocalError("관리자 이메일을 입력해 주세요.");
      return;
    }

    setLocalError(null);

    if (admin) {
      onUpdate({
        name,
        role,
        status
      });
      return;
    }

    onCreate({
      email,
      name,
      role
    });
  }

  return (
    <div className="sheet-backdrop" role="presentation">
      <section
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-form-title"
      >
        <div className="sheet-header">
          <div>
            <p className="eyebrow">
              {admin ? "관리자 정보 수정" : "새 관리자 등록"}
            </p>
            <h2 id="admin-form-title">
              {admin ? admin.name : "관리자 추가"}
            </h2>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="닫기"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <form className="sheet-form" onSubmit={submitForm}>
          <label className="field">
            <span>이메일</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              autoComplete="off"
              placeholder="admin@example.com"
              disabled={Boolean(admin) || isSaving}
            />
          </label>

          <label className="field">
            <span>이름</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              autoFocus={Boolean(admin)}
              disabled={isSaving}
            />
          </label>

          <label className="field">
            <span>역할</span>
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as AdminRole)
              }
              disabled={isSaving}
            >
              <option value="admin">관리자</option>
              <option value="super_admin">최고관리자</option>
            </select>
          </label>

          {admin ? (
            <label className="field">
              <span>상태</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as "active" | "inactive"
                  )
                }
                disabled={isSaving}
              >
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
            </label>
          ) : (
            <div className="form-guidance">
              등록 후 비밀번호 설정 이메일을 발송합니다. 이메일 링크는
              30분 동안 한 번만 사용할 수 있습니다.
            </div>
          )}

          {localError || errorMessage ? (
            <div className="form-error" role="alert">
              {localError || errorMessage}
            </div>
          ) : null}

          <div className="sheet-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              취소
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={isSaving}
            >
              {isSaving ? "저장 중" : admin ? "수정" : "등록"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
