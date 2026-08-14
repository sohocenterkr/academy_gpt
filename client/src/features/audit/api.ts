export type AuditLogItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
};

export type AuditLogResponse = {
  items: AuditLogItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AuditLogQuery = {
  page: number;
  pageSize: number;
  action?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getAuditLogs(
  query: AuditLogQuery
): Promise<AuditLogResponse> {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize)
  });

  if (query.action) {
    search.set("action", query.action);
  }

  if (query.entityId) {
    search.set("entityId", query.entityId);
  }

  if (query.dateFrom) {
    search.set("dateFrom", query.dateFrom);
  }

  if (query.dateTo) {
    search.set("dateTo", query.dateTo);
  }

  const response = await fetch(`/api/audit-logs?${search.toString()}`, {
    method: "GET",
    credentials: "include"
  });

  if (!response.ok) {
    let message = "감사기록을 불러올 수 없습니다.";

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

  return response.json() as Promise<AuditLogResponse>;
}
