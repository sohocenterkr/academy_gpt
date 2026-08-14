import { Router } from "express";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { auditLogs, schools, type School } from "../../shared/schema";
import { toKstIsoString } from "../../shared/kst";
import {
  cleanOptionalRegion,
  cleanReferenceName,
  normalizeReferenceName,
  schoolCreateSchema,
  schoolUpdateSchema
} from "../../shared/validators/academics";
import { getDatabase } from "../db";
import {
  getAuthenticatedLocals,
  requirePermission
} from "../middleware/auth";

export const schoolsRouter = Router();

const listQuerySchema = z.object({
  includeInactive: z.enum(["true", "false"]).optional()
});

function serializeSchool(school: School) {
  return {
    id: school.id,
    name: school.name,
    region: school.region,
    sortOrder: school.sortOrder,
    isActive: school.isActive,
    createdAt: toKstIsoString(school.createdAt),
    updatedAt: toKstIsoString(school.updatedAt)
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

schoolsRouter.get(
  "/",
  requirePermission("academics:view"),
  async (request, response, next) => {
    try {
      const parsed = listQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        response.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message: "조회 조건이 올바르지 않습니다.",
            details: parsed.error.flatten()
          }
        });
        return;
      }

      const conditions = [isNull(schools.deletedAt)];

      if (parsed.data.includeInactive !== "true") {
        conditions.push(eq(schools.isActive, true));
      }

      const database = getDatabase();
      const rows = await database
        .select()
        .from(schools)
        .where(and(...conditions))
        .orderBy(asc(schools.sortOrder), asc(schools.name));

      response.status(200).json({
        items: rows.map(serializeSchool)
      });
    } catch (error) {
      next(error);
    }
  }
);


schoolsRouter.post(
  "/",
  requirePermission("academics:manage"),
  async (request, response, next) => {
    const parsed = schoolCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: "INVALID_SCHOOL",
          message: "학교 정보를 확인해 주세요.",
          details: parsed.error.flatten()
        }
      });
      return;
    }

    try {
      const database = getDatabase();
      const admin = getAuthenticatedLocals(response.locals);
      const name = cleanReferenceName(parsed.data.name);
      const region = cleanOptionalRegion(parsed.data.region);

      const school = await database.transaction(async (transaction) => {
        const [created] = await transaction
          .insert(schools)
          .values({
            name,
            nameNormalized: normalizeReferenceName(name),
            region,
            sortOrder: parsed.data.sortOrder,
            isActive: parsed.data.isActive,
            createdBy: admin.id,
            updatedBy: admin.id
          })
          .returning();

        if (!created) {
          throw new Error("학교 생성 결과를 확인할 수 없습니다.");
        }

        await transaction.insert(auditLogs).values({
          actorAdminId: admin.id,
          action: "SCHOOL_CREATED",
          entityType: "school",
          entityId: created.id,
          metadata: {
            name: created.name,
            region: created.region,
            sortOrder: created.sortOrder,
            isActive: created.isActive
          },
          ipAddress: request.ip,
          userAgent: request.get("user-agent")
        });

        return created;
      });

      response.status(201).json({
        item: serializeSchool(school)
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        response.status(409).json({
          error: {
            code: "SCHOOL_NAME_ALREADY_EXISTS",
            message: "같은 이름의 활성 학교가 이미 있습니다."
          }
        });
        return;
      }

      next(error);
    }
  }
);


schoolsRouter.patch(
  "/:id",
  requirePermission("academics:manage"),
  async (request, response, next) => {
    const idResult = z.string().uuid().safeParse(request.params.id);
    const bodyResult = schoolUpdateSchema.safeParse(request.body);

    if (!idResult.success || !bodyResult.success) {
      response.status(400).json({
        error: {
          code: "INVALID_SCHOOL",
          message: "학교 수정 정보를 확인해 주세요."
        }
      });
      return;
    }

    try {
      const database = getDatabase();
      const admin = getAuthenticatedLocals(response.locals);
      const school = await database.transaction(async (transaction) => {
        const [existing] = await transaction
          .select()
          .from(schools)
          .where(
            and(
              eq(schools.id, idResult.data),
              isNull(schools.deletedAt)
            )
          )
          .limit(1);

        if (!existing) {
          return null;
        }

        const nextName =
          bodyResult.data.name === undefined
            ? existing.name
            : cleanReferenceName(bodyResult.data.name);

        const nextRegion =
          bodyResult.data.region === undefined
            ? existing.region
            : cleanOptionalRegion(bodyResult.data.region);

        const [updated] = await transaction
          .update(schools)
          .set({
            name: nextName,
            nameNormalized: normalizeReferenceName(nextName),
            region: nextRegion,
            sortOrder:
              bodyResult.data.sortOrder ?? existing.sortOrder,
            isActive:
              bodyResult.data.isActive ?? existing.isActive,
            updatedBy: admin.id,
            updatedAt: new Date()
          })
          .where(eq(schools.id, existing.id))
          .returning();

        if (!updated) {
          throw new Error("학교 수정 결과를 확인할 수 없습니다.");
        }

        await transaction.insert(auditLogs).values({
          actorAdminId: admin.id,
          action:
            existing.isActive && !updated.isActive
              ? "SCHOOL_DEACTIVATED"
              : "SCHOOL_UPDATED",
          entityType: "school",
          entityId: updated.id,
          metadata: {
            before: {
              name: existing.name,
              region: existing.region,
              sortOrder: existing.sortOrder,
              isActive: existing.isActive
            },
            after: {
              name: updated.name,
              region: updated.region,
              sortOrder: updated.sortOrder,
              isActive: updated.isActive
            }
          },
          ipAddress: request.ip,
          userAgent: request.get("user-agent")
        });

        return updated;
      });

      if (!school) {
        response.status(404).json({
          error: {
            code: "SCHOOL_NOT_FOUND",
            message: "학교 정보를 찾을 수 없습니다."
          }
        });
        return;
      }

      response.status(200).json({
        item: serializeSchool(school)
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        response.status(409).json({
          error: {
            code: "SCHOOL_NAME_ALREADY_EXISTS",
            message: "같은 이름의 활성 학교가 이미 있습니다."
          }
        });
        return;
      }

      next(error);
    }
  }
);
