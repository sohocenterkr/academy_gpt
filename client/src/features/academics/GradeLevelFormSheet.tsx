import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type {
  GradeLevelInput,
  GradeLevelItem
} from "./api";

type GradeLevelFormSheetProps = {
  gradeLevel: GradeLevelItem | null;
  defaultSortOrder: number;
  isSaving: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (input: GradeLevelInput) => void;
};

export function GradeLevelFormSheet({
  gradeLevel,
  defaultSortOrder,
  isSaving,
  errorMessage,
  onClose,
  onSubmit
}: GradeLevelFormSheetProps) {
  const [name, setName] = useState(gradeLevel?.name ?? "");
  const [sortOrder, setSortOrder] = useState(
    String(gradeLevel?.sortOrder ?? defaultSortOrder)
  );
  const [isActive, setIsActive] = useState(
    gradeLevel?.isActive ?? true
  );
  const [localError, setLocalError] = useState<string | null>(null);

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedSortOrder = Number(sortOrder);

    if (!name.trim()) {
      setLocalError("학년명을 입력해 주세요.");
      return;
    }

    if (
      !Number.isInteger(parsedSortOrder) ||
      parsedSortOrder < 0 ||
      parsedSortOrder > 9999
    ) {
      setLocalError("정렬 순서는 0부터 9999 사이의 정수여야 합니다.");
      return;
    }

    setLocalError(null);
    onSubmit({
      name,
      sortOrder: parsedSortOrder,
      isActive
    });
  }

  return (
    <div className="sheet-backdrop" role="presentation">
      <section
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grade-form-title"
      >
        <div className="sheet-header">
          <div>
            <p className="eyebrow">
              {gradeLevel ? "학년 정보 수정" : "새 학년 등록"}
            </p>
            <h2 id="grade-form-title">
              {gradeLevel ? gradeLevel.name : "학년 추가"}
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
            <span>학년명</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoFocus
              placeholder="예: 초등 1학년"
              disabled={isSaving}
            />
          </label>

          <label className="field">
            <span>정렬 순서</span>
            <input
              type="number"
              min="0"
              max="9999"
              step="1"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              disabled={isSaving}
            />
          </label>

          <label className="check-field">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              disabled={isSaving}
            />
            <span>
              <strong>사용 중</strong>
              <small>
                해제하면 신규 학생 등록 목록에서 제외됩니다.
              </small>
            </span>
          </label>

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
              {isSaving ? "저장 중" : "저장"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
