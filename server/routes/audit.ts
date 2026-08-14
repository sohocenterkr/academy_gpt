import { Router } from "express";
import {
  and,
  desc,
  eq,
  gte,
  lte,
  sql,
  type SQL
} from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "../db";
import { requirePermission } from "../middleware/auth";
import {
  getKstDateEnd,
  getKstDateStart,
  toKstIsoString
} from "../../shared/kst";
import { admins, auditLogs } from "../../shared/schema";

const router = Router();

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().max(100).optional(),
  entityId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
});

router.get("/", requirePermission("audit:view"), async (
  request,
  response,
  next
) => {
  try {
    const parsed = auditQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: "INVALID_AUDIT_QUERY",
          message: "감사기록 조회 조건을 확인해 주세요."
        }
      });
      return;
    }

    const {
      page,
      pageSize,
      action,
      entityId,
      dateFrom,
      dateTo
    } = parsed.data;

    if (dateFrom && dateTo && dateFrom > dateTo) {
      response.status(400).json({
        error: {
          code: "INVALID_AUDIT_DATE_RANGE",
          message: "시작일은 종료일보다 늦을 수 없습니다."
        }
      });
      return;
    }

    const conditions: SQL[] = [];

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (entityId) {
      conditions.push(eq(auditLogs.entityId, entityId));
    }

    if (dateFrom) {
      conditions.push(gte(auditLogs.createdAt, getKstDateStart(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(auditLogs.createdAt, getKstDateEnd(dateTo)));
    }

    const whereCondition =
      conditions.length > 0 ? and(...conditions) : undefined;
    const database = getDatabase();

    const [countResult] = await database
      .select({
        total: sql<number>`count(*)::int`
      })
      .from(auditLogs)
      .where(whereCondition);

    const rows = await database
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        actorId: auditLogs.actorAdminId,
        actorName: admins.name,
        actorEmail: admins.email
      })
      .from(auditLogs)
      .leftJoin(admins, eq(auditLogs.actorAdminId, admins.id))
      .where(whereCondition)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const total = countResult?.total ?? 0;

    response.status(200).json({
      items: rows.map((row) => ({
        ...row,
        createdAt: toKstIsoString(row.createdAt)
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as auditRouter };
