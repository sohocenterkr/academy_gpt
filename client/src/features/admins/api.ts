import type { AdminRole } from "../../../../shared/permissions";

export type AdminStatus = "active" | "inactive" | "locked";

export type AdminItem = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: AdminStatus;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminListResponse = {
  items: AdminItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AdminListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  role?: AdminRole;
  status?: AdminStatus;
};

export type AdminCreateInput = {
  email: string;
  name: string;
  role: AdminRole;
};

export type AdminUpdateInput = {
  name?: string;
  role?: AdminRole;
  status?: "active" | "inactive";
};

async function requestJson<T>(
  url: string,
  options: RequestInit,
  fallbackMessage: string
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    let message = fallbackMessage;

    try {
      const body = (await response.json()) as {
        error?: { message?: string };
      };
      message = body.error?.message ?? message;
    } catch {
      // JSON이 아닌 오류 응답은 기본 메시지를 사용합니다.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function getAdmins(
  query: AdminListQuery
): Promise<AdminListResponse> {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize)
  });

  if (query.search) search.set("search", query.search);
  if (query.role) search.set("role", query.role);
  if (query.status) search.set("status", query.status);

  return requestJson<AdminListResponse>(
    `/api/admins?${search.toString()}`,
    { method: "GET" },
    "관리자 목록을 불러올 수 없습니다."
  );
}

export async function createAdmin(
  input: AdminCreateInput
): Promise<{ item: AdminItem; emailSent: boolean }> {
  return requestJson(
    "/api/admins",
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    "관리자를 등록할 수 없습니다."
  );
}

export async function updateAdmin(
  id: string,
  input: AdminUpdateInput
): Promise<AdminItem> {
  const result = await requestJson<{ item: AdminItem }>(
    `/api/admins/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input)
    },
    "관리자 정보를 수정할 수 없습니다."
  );

  return result.item;
}

export async function sendAdminResetEmail(
  id: string
): Promise<{ success: true; expiresAt: string }> {
  return requestJson(
    `/api/admins/${id}/send-reset`,
    {
      method: "POST",
      body: JSON.stringify({})
    },
    "비밀번호 설정 이메일을 발송할 수 없습니다."
  );
}
