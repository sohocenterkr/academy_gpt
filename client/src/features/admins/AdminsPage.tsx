import { useState, type FormEvent } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { ArrowLeft, Plus, ShieldAlert } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  hasPermission,
  type AdminRole
} from "../../../../shared/permissions";
import { AppHeader } from "../../components/layout/AppHeader";
import {
  logoutAdmin,
  type PublicAdmin
} from "../auth/api";
import { currentAdminQueryKey } from "../auth/useCurrentAdmin";
import { AdminFilters } from "./AdminFilters";
import { AdminFormSheet } from "./AdminFormSheet";
import { AdminList } from "./AdminList";
import { RolePermissionTable } from "./RolePermissionTable";
import {
  createAdmin,
  getAdmins,
  sendAdminResetEmail,
  updateAdmin,
  type AdminCreateInput,
  type AdminItem,
  type AdminListQuery,
  type AdminStatus,
  type AdminUpdateInput
} from "./api";

type AdminsPageProps = {
  admin: PublicAdmin;
};

export function AdminsPage({ admin }: AdminsPageProps) {
  const [draftSearch, setDraftSearch] = useState("");
  const [draftRole, setDraftRole] =
    useState<"" | AdminRole>("");
  const [draftStatus, setDraftStatus] =
    useState<"" | AdminStatus>("");
  const [query, setQuery] = useState<AdminListQuery>({
    page: 1,
    pageSize: 20
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] =
    useState<AdminItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const admins = useQuery({
    queryKey: ["admins", query],
    queryFn: () => getAdmins(query),
    placeholderData: keepPreviousData
  });

  const createMutation = useMutation({
    mutationFn: createAdmin,
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admins"] });
      setIsFormOpen(false);
      setEditingAdmin(null);
      setNotice(
        result.emailSent
          ? "관리자를 등록하고 비밀번호 설정 이메일을 발송했습니다."
          : "관리자는 등록됐지만 이메일 발송에 실패했습니다. 재설정 메일을 다시 보내 주세요."
      );
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input
    }: {
      id: string;
      input: AdminUpdateInput;
    }) => updateAdmin(id, input),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["admins"] });

      if (updated.id === admin.id) {
        await queryClient.invalidateQueries({
          queryKey: currentAdminQueryKey
        });
      }

      setIsFormOpen(false);
      setEditingAdmin(null);
      setNotice("관리자 정보를 수정했습니다.");
    }
  });

  const resetEmailMutation = useMutation({
    mutationFn: async (target: AdminItem) => {
      const result = await sendAdminResetEmail(target.id);
      return { target, result };
    },
    onSuccess: ({ target }) => {
      setNotice(
        `${target.name} 관리자에게 비밀번호 설정 이메일을 발송했습니다.`
      );
    }
  });

  const logout = useMutation({
    mutationFn: logoutAdmin,
    onSuccess: () => {
      queryClient.setQueryData(currentAdminQueryKey, null);
      navigate("/login", { replace: true });
    }
  });

  if (!hasPermission(admin.role, "administrators:view")) {
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
            <p>관리자 계정은 최고관리자만 관리할 수 있습니다.</p>
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
      search: draftSearch.trim() || undefined,
      role: draftRole || undefined,
      status: draftStatus || undefined
    });
  }

  function resetFilters() {
    setDraftSearch("");
    setDraftRole("");
    setDraftStatus("");
    setQuery({ page: 1, pageSize: 20 });
  }

  function openCreateForm() {
    setEditingAdmin(null);
    setNotice(null);
    createMutation.reset();
    updateMutation.reset();
    setIsFormOpen(true);
  }

  function openEditForm(target: AdminItem) {
    setEditingAdmin(target);
    setNotice(null);
    createMutation.reset();
    updateMutation.reset();
    setIsFormOpen(true);
  }

  function closeForm() {
    if (createMutation.isPending || updateMutation.isPending) return;
    setIsFormOpen(false);
    setEditingAdmin(null);
  }

  function requestResetEmail(target: AdminItem) {
    const confirmed = window.confirm(
      `${target.name} 관리자에게 비밀번호 설정 이메일을 보내시겠습니까?`
    );

    if (confirmed) {
      setNotice(null);
      resetEmailMutation.mutate(target);
    }
  }

  const pagination = admins.data?.pagination;
  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    resetEmailMutation.isPending;

  const saveError =
    createMutation.isError && createMutation.error instanceof Error
      ? createMutation.error.message
      : updateMutation.isError &&
          updateMutation.error instanceof Error
        ? updateMutation.error.message
        : null;

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
                <h1 className="page-title">관리자 계정</h1>
                <p className="page-description">
                  관리자 역할과 상태, 비밀번호 설정 메일을 관리합니다.
                </p>
              </div>

              <Link href="/" className="button button-secondary">
                <ArrowLeft size={18} aria-hidden="true" />
                대시보드
              </Link>
            </div>
          </section>

          <section className="content-card">
            <div className="reference-toolbar">
              <div>
                <p className="eyebrow">계정 관리</p>
                <h2>관리자 목록</h2>
              </div>
              <button
                type="button"
                className="button button-primary"
                onClick={openCreateForm}
              >
                <Plus size={18} aria-hidden="true" />
                관리자 추가
              </button>
            </div>

            <AdminFilters
              search={draftSearch}
              role={draftRole}
              status={draftStatus}
              onSearchChange={setDraftSearch}
              onRoleChange={setDraftRole}
              onStatusChange={setDraftStatus}
              onSubmit={applyFilters}
              onReset={resetFilters}
            />

            {notice ? (
              <div className="form-success" role="status">
                {notice}
              </div>
            ) : null}

            {resetEmailMutation.isError ? (
              <div className="form-error" role="alert">
                {resetEmailMutation.error instanceof Error
                  ? resetEmailMutation.error.message
                  : "재설정 이메일을 발송할 수 없습니다."}
              </div>
            ) : null}

            {admins.isPending ? (
              <div className="reference-state">
                관리자 목록을 불러오는 중입니다.
              </div>
            ) : null}

            {admins.isError ? (
              <div className="form-error" role="alert">
                {admins.error instanceof Error
                  ? admins.error.message
                  : "관리자 목록을 불러올 수 없습니다."}
              </div>
            ) : null}

            {admins.data ? (
              <>
                <AdminList
                  items={admins.data.items}
                  currentAdminId={admin.id}
                  isMutating={isMutating}
                  onEdit={openEditForm}
                  onSendReset={requestResetEmail}
                />

                <nav className="pagination" aria-label="관리자 페이지">
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
            ) : null}
          </section>

          <section className="content-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">역할 정책</p>
                <h2>권한 비교</h2>
              </div>
            </div>
            <RolePermissionTable />
          </section>
        </div>
      </main>

      {isFormOpen ? (
        <AdminFormSheet
          key={editingAdmin?.id ?? "new-admin"}
          admin={editingAdmin}
          isSaving={
            createMutation.isPending || updateMutation.isPending
          }
          errorMessage={saveError}
          onClose={closeForm}
          onCreate={(input: AdminCreateInput) =>
            createMutation.mutate(input)
          }
          onUpdate={(input: AdminUpdateInput) => {
            if (editingAdmin) {
              updateMutation.mutate({
                id: editingAdmin.id,
                input
              });
            }
          }}
        />
      ) : null}
    </div>
  );
}
