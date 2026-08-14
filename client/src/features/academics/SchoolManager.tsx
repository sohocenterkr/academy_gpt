import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  School
} from "lucide-react";
import {
  createSchool,
  getSchools,
  updateSchool,
  type SchoolInput,
  type SchoolItem
} from "./api";
import { SchoolFormSheet } from "./SchoolFormSheet";

type SchoolManagerProps = {
  canManage: boolean;
};

const schoolsQueryKey = ["schools", { includeInactive: true }] as const;

export function SchoolManager({ canManage }: SchoolManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] =
    useState<SchoolItem | null>(null);
  const queryClient = useQueryClient();

  const schools = useQuery({
    queryKey: schoolsQueryKey,
    queryFn: () => getSchools(true)
  });

  const saveSchool = useMutation({
    mutationFn: (input: SchoolInput) =>
      editingSchool
        ? updateSchool(editingSchool.id, input)
        : createSchool(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: schoolsQueryKey
      });
      setIsFormOpen(false);
      setEditingSchool(null);
    }
  });

  const toggleSchool = useMutation({
    mutationFn: (school: SchoolItem) =>
      updateSchool(school.id, {
        isActive: !school.isActive
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: schoolsQueryKey
      });
    }
  });

  const moveSchool = useMutation({
    mutationFn: async ({
      school,
      direction
    }: {
      school: SchoolItem;
      direction: -1 | 1;
    }) => {
      const currentItems = schools.data ?? [];
      const currentIndex = currentItems.findIndex(
        (item) => item.id === school.id
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
            : updateSchool(item.id, {
                sortOrder: nextSortOrder
              });
        })
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: schoolsQueryKey
      });
    }
  });

  const defaultSortOrder =
    schools.data && schools.data.length > 0
      ? Math.max(...schools.data.map((item) => item.sortOrder)) + 10
      : 10;

  function openCreateForm() {
    setEditingSchool(null);
    saveSchool.reset();
    setIsFormOpen(true);
  }

  function openEditForm(school: SchoolItem) {
    setEditingSchool(school);
    saveSchool.reset();
    setIsFormOpen(true);
  }

  function closeForm() {
    if (saveSchool.isPending) {
      return;
    }

    setIsFormOpen(false);
    setEditingSchool(null);
    saveSchool.reset();
  }

  return (
    <div className="reference-manager">
      <div className="reference-toolbar">
        <div>
          <h2>학교 목록</h2>
          <p>학생 등록 화면에서 선택할 학교를 관리합니다.</p>
        </div>

        {canManage ? (
          <button
            type="button"
            className="button button-primary"
            onClick={openCreateForm}
          >
            <Plus size={18} aria-hidden="true" />
            학교 추가
          </button>
        ) : (
          <span className="read-only-badge">조회 전용</span>
        )}
      </div>

      {schools.isPending ? (
        <div className="reference-state">
          학교 목록을 불러오는 중입니다.
        </div>
      ) : null}

      {schools.isError ? (
        <div className="form-error" role="alert">
          {schools.error instanceof Error
            ? schools.error.message
            : "학교 목록을 불러올 수 없습니다."}
        </div>
      ) : null}

      {toggleSchool.isError ? (
        <div className="form-error" role="alert">
          {toggleSchool.error instanceof Error
            ? toggleSchool.error.message
            : "학교 사용 상태를 변경할 수 없습니다."}
        </div>
      ) : null}

      {schools.data?.length === 0 ? (
        <div className="reference-empty">
          <School size={30} aria-hidden="true" />
          <strong>등록된 학교가 없습니다</strong>
          <p>학교를 추가하면 학생 등록 화면에서 선택할 수 있습니다.</p>
        </div>
      ) : null}

      {schools.data && schools.data.length > 0 ? (
        <div className="reference-list">
          {schools.data.map((school) => (
            <article
              className={
                school.isActive
                  ? "reference-item"
                  : "reference-item is-inactive"
              }
              key={school.id}
            >
              <div className="reference-order">
                {school.sortOrder}
              </div>

              <div className="reference-item-main">
                <strong>{school.name}</strong>
                <small>{school.region || "지역 미지정"}</small>
              </div>

              <span
                className={
                  school.isActive
                    ? "status-badge is-active"
                    : "status-badge is-inactive"
                }
              >
                {school.isActive ? "사용 중" : "사용 안 함"}
              </span>

              {canManage ? (
                <div className="reference-actions">
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    aria-label={`${school.name} 위로 이동`}
                    onClick={() =>
                      moveSchool.mutate({
                        school,
                        direction: -1
                      })
                    }
                    disabled={
                      moveSchool.isPending ||
                      schools.data?.[0]?.id === school.id
                    }
                  >
                    <ChevronUp size={16} aria-hidden="true" />
                    위
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    aria-label={`${school.name} 아래로 이동`}
                    onClick={() =>
                      moveSchool.mutate({
                        school,
                        direction: 1
                      })
                    }
                    disabled={
                      moveSchool.isPending ||
                      schools.data?.at(-1)?.id === school.id
                    }
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                    아래
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => openEditForm(school)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    수정
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-small"
                    onClick={() => toggleSchool.mutate(school)}
                    disabled={toggleSchool.isPending}
                  >
                    {school.isActive ? "사용 중지" : "다시 사용"}
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {isFormOpen ? (
        <SchoolFormSheet
          key={editingSchool?.id ?? "new-school"}
          school={editingSchool}
          defaultSortOrder={defaultSortOrder}
          isSaving={saveSchool.isPending}
          errorMessage={
            saveSchool.isError && saveSchool.error instanceof Error
              ? saveSchool.error.message
              : null
          }
          onClose={closeForm}
          onSubmit={(input) => saveSchool.mutate(input)}
        />
      ) : null}
    </div>
  );
}
