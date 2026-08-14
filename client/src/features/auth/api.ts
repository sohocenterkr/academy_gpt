import type { AdminRole, Permission } from "../../../../shared/permissions";

export type PublicAdmin = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  createdAt: string;
  passwordChangedAt: string;
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = {};

  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = {};
  }

  return new ApiError(
    body.error?.message ?? "요청을 처리할 수 없습니다.",
    response.status,
    body.error?.code ?? "UNKNOWN_ERROR"
  );
}

export async function getCurrentAdmin(): Promise<PublicAdmin | null> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include"
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  const body = (await response.json()) as { admin: PublicAdmin };
  return body.admin;
}

export async function loginAdmin(input: {
  email: string;
  password: string;
}): Promise<PublicAdmin> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const body = (await response.json()) as { admin: PublicAdmin };
  return body.admin;
}

export async function logoutAdmin(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include"
  });

  if (!response.ok) {
    throw await parseError(response);
  }
}


export async function requestPasswordReset(email: string): Promise<string> {
  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const body = (await response.json()) as {
    success: true;
    message: string;
  };

  return body.message;
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<string> {
  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const body = (await response.json()) as {
    success: true;
    message: string;
  };

  return body.message;
}


export async function getCurrentPermissions(): Promise<Permission[]> {
  const response = await fetch("/api/auth/permissions", {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  const body = (await response.json()) as {
    permissions: Permission[];
  };

  return body.permissions;
}
