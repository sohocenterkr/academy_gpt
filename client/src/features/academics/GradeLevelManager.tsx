import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Layers3,
  Pencil,
  Plus
} from "lucide-react";
import {
  createGradeLevel,
  getGradeLevels,
  updateGradeLevel,
  type GradeLevelInput,
  type GradeLevelItem
} from "./api";
import { GradeLevelFormSheet } from "./GradeLevelFormSheet";

type GradeLevelManagerProps = {
  canManage: boolean;
};

const gradeLevelsQueryKey = [
  "grade-levels",
  { includeInactive: true }
] as const;

export function GradeLevelManager({
  canManage
}: GradeLevelManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGradeLevel, setEditingGradeLevel] =
    useState<GradeLevelItem | null>(null);
  const queryClient = useQueryClient();

  const gradeLevels = useQuery({
    queryKey: gradeLevelsQueryKey,
    queryFn: () => getGradeLevels(true)
  });

  const saveGradeLevel = useMutation({
    mutationFn: (input: GradeLevelInput) =>
      editingGradeLevel
        ? updateGradeLevel(editingGradeLevel.id, input)
        : createGradeLevel(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: gradeLevelsQueryKey
      });
      setIsFormOpen(false);
      setEditingGradeLevel(null);
    }
  });

  const toggleGradeLevel = useMutation({
    mutationFn: (gradeLevel: GradeLevelItem) =>
      updateGradeLevel(gradeLevel.id, {
        isActive: !gradeLevel.isActive
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: gradeLevelsQueryKey
      });
    }
  });

  const moveGradeLevel = useMutation({
    mutationFn: async ({
      gradeLevel,
      direction
    }: {
      gradeLevel: GradeLevelItem;
      direction: -1 | 1;
    }) => {
      const currentItems = gradeLevels.data ?? [];
      const currentIndex = currentItems.findIndex(
        (item) => item.id === gradeLevel.id
      );
      const targetIndex = currentIndex + direction;

      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= currentItems.length
      ) {
        return;
      }

      const reordered = [...currentItems];
      const [moved] = reordered.splice(currentIndex, 1);

      if (!moved) {
        return;
      }

      reordered.splice(targetIndex, 0, moved);

      await Promise.all(
        reordered.map((item, index) => {
          const nextSortOrder = (index + 1) * 10;

          return item.sortOrder === nextSortOrder
            ? Promise.resolve(item)
            : updateGradeLevel(item.id, {
                sortOrder: nextSortOrder
              });
        })
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: gradeLevelsQueryKey
      });
    }
  });

  const defaultSortOrder =
    gradeLevels.data && gradeLevels.data.length > 0
      ? Math.max(...gradeLevels.data.map((item) => item.sortOrder)) + 10
      : 10;

  function openCreateForm() {
    setEditingGradeLevel(null);
    saveGradeLevel.reset();
    setIsFormOpen(true);
  }

  function openEditForm(gradeLevel: GradeLevelItem) {
    setEditingGradeLevel(gradeLevel);
    saveGradeLevel.reset();
    setIsFormOpen(true);
  }

  function closeForm() {
    if (saveGradeLevel.isPending) {
      return;
    }

    setIsFormOpen(false);
    setEditingGradeLevel(null);
    saveGradeLevel.reset();
  }

  return (
    <div className="reference-manager">
      <div className="reference-toolbar">
        <div>
          <h2>학년 목록</h2>
          <p>학생 등록 화면에서 선택할 학년을 관리합니다.</p>
        </div>

        {canManage ? (
          <button
            type="button"
            className="button button-primary"
            onClick={openCreateForm}
          >
            <Plus size={18} aria-hidden="true" />
            학년 추가
          </button>
        ) : (
          <span className="read-only-badge">조회 전용</span>
        )}
      </div>

      {gradeLevels.isPending ? (
        <div className="reference-state">
          학년 목록을 불러오는 중입니다.
        </div>
      ) : null}

      {gradeLevels.isError ? (
        <div className="form-error" role="alert">
          {gradeLevels.error instanceof Error
            ? gradeLevels.error.message
            : "학년 목록을 불러올 수 없습니다."}
        </div>
      ) : null}

      {toggleGradeLevel.isError ? (
        <div className="form-error" role="alert">
          {toggleGradeLevel.error instanceof Error
            ? toggleGradeLevel.error.message
            : "학년 사용 상태를 변경할 수 없습니다."}
        </div>
      ) : null}

      {gradeLevels.data?.length === 0 ? (
        <div className="reference-empty">
          <Layers3 size={30} aria-hidden="true" />
          <strong>등록된 학년이 없습니다</strong>
          <p>학년을 추가하면 학생 등록 화면에서 선택할 수 있습니다.</p>
        </div>
      ) : null}

      {gradeLevels.data && gradeLevels.data.length > 0 ? (
        <div className="reference-list">
          {gradeLevels.data.map((gradeLevel) => (
            <article
              className={
                gradeLevel.isActive
                  ? "reference-item"
                  : "reference-item is-inactive"
              }
              key={gradeLevel.id}
            >
              <div className="reference-order">
                {gradeLevel.sortOrder}
              </div>

              <div className="reference-item-main">
                <strong>{gradeLevel.name}</strong>
                <small>정렬 순서 {gradeLevel.sortOrder}</small>
              </div>

              <span
                className={
                  gradeLevel.isActive
                    ? "status-badge is-active"
                    : "status-badge is-inactive"
                }
              >
                {gradeLevel.isActive ? "사용 중" : "사용 안 함"}
              </span>

              {canManage ? (
                <div className="reference-actions">
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    aria-label={`${gradeLevel.name} 위로 이동`}
                    onClick={() =>
                      moveGradeLevel.mutate({
                        gradeLevel,
                        direction: -1
                      })
                    }
                    disabled={
                      moveGradeLevel.isPending ||
                      gradeLevels.data?.[0]?.id === gradeLevel.id
                    }
                  >
                    <ChevronUp size={16} aria-hidden="true" />
                    위
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    aria-label={`${gradeLevel.name} 아래로 이동`}
                    onClick={() =>
                      moveGradeLevel.mutate({
                        gradeLevel,
                        direction: 1
                      })
                    }
                    disabled={
                      moveGradeLevel.isPending ||
                      gradeLevels.data?.at(-1)?.id === gradeLevel.id
                    }
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                    아래
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => openEditForm(gradeLevel)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    수정
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => toggleGradeLevel.mutate(gradeLevel)}
                    disabled={toggleGradeLevel.isPending}
                  >
                    {gradeLevel.isActive ? "사용 중지" : "다시 사용"}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {isFormOpen ? (
        <GradeLevelFormSheet
          key={editingGradeLevel?.id ?? "new-grade-level"}
          gradeLevel={editingGradeLevel}
          defaultSortOrder={defaultSortOrder}
          isSaving={saveGradeLevel.isPending}
          errorMessage={
            saveGradeLevel.isError &&
            saveGradeLevel.error instanceof Error
              ? saveGradeLevel.error.message
              : null
          }
          onClose={closeForm}
          onSubmit={(input) => saveGradeLevel.mutate(input)}
        />
      ) : null}
    </div>
  );
}
