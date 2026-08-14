import { Router } from "express";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  auditLogs,
  gradeLevels,
  type GradeLevel
} from "../../shared/schema";
import { toKstIsoString } from "../../shared/kst";
import {
  cleanReferenceName,
  gradeLevelCreateSchema,
  gradeLevelUpdateSchema,
  normalizeReferenceName
} from "../../shared/validators/academics";
import { getDatabase } from "../db";
import {
  getAuthenticatedLocals,
  requirePermission
} from "../middleware/auth";

export const gradeLevelsRouter = Router();

const listQuerySchema = z.object({
  includeInactive: z.enum(["true", "false"]).optional()
});

function serializeGradeLevel(gradeLevel: GradeLevel) {
  return {
    id: gradeLevel.id,
    name: gradeLevel.name,
    sortOrder: gradeLevel.sortOrder,
    isActive: gradeLevel.isActive,
    createdAt: toKstIsoString(gradeLevel.createdAt),
    updatedAt: toKstIsoString(gradeLevel.updatedAt)
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

gradeLevelsRouter.get(
  "/",
  requirePermission("academics:view"),
  async (request, response, next) => {
    try {
      const parsed = listQuerySchema.safeParse(request.query);

      if (!parsed.success) {
        response.status(400).json({
          error: {
            code: "INVALID_QUERY",
            message: "조회 조건이 올바르지 않습니다."
          }
        });
        return;
      }

      const conditions = [isNull(gradeLevels.deletedAt)];

      if (parsed.data.includeInactive !== "true") {
        conditions.push(eq(gradeLevels.isActive, true));
      }

      const database = getDatabase();
      const rows = await database
        .select()
        .from(gradeLevels)
        .where(and(...conditions))
        .orderBy(
          asc(gradeLevels.sortOrder),
          asc(gradeLevels.name)
        );

      response.status(200).json({
        items: rows.map(serializeGradeLevel)
      });
    } catch (error) {
      next(error);
    }
  }
);


gradeLevelsRouter.post(
  "/",
  requirePermission("academics:manage"),
  async (request, response, next) => {
    const parsed = gradeLevelCreateSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: "INVALID_GRADE_LEVEL",
          message: "학년 정보를 확인해 주세요.",
          details: parsed.error.flatten()
        }
      });
      return;
    }

    try {
      const database = getDatabase();
      const admin = getAuthenticatedLocals(response.locals);
      const name = cleanReferenceName(parsed.data.name);

      const gradeLevel = await database.transaction(
        async (transaction) => {
          const [created] = await transaction
            .insert(gradeLevels)
            .values({
              name,
              nameNormalized: normalizeReferenceName(name),
              sortOrder: parsed.data.sortOrder,
              isActive: parsed.data.isActive,
              createdBy: admin.id,
              updatedBy: admin.id
            })
            .returning();

          if (!created) {
            throw new Error("학년 생성 결과를 확인할 수 없습니다.");
          }

          await transaction.insert(auditLogs).values({
            actorAdminId: admin.id,
            action: "GRADE_LEVEL_CREATED",
            entityType: "grade_level",
            entityId: created.id,
            metadata: {
              name: created.name,
              sortOrder: created.sortOrder,
              isActive: created.isActive
            },
            ipAddress: request.ip,
            userAgent: request.get("user-agent")
          });

          return created;
        }
      );

      response.status(201).json({
        item: serializeGradeLevel(gradeLevel)
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        response.status(409).json({
          error: {
            code: "GRADE_LEVEL_NAME_ALREADY_EXISTS",
            message: "같은 이름의 활성 학년이 이미 있습니다."
          }
        });
        return;
      }

      next(error);
    }
  }
);


gradeLevelsRouter.patch(
  "/:id",
  requirePermission("academics:manage"),
  async (request, response, next) => {
    const idResult = z.string().uuid().safeParse(request.params.id);
    const bodyResult = gradeLevelUpdateSchema.safeParse(request.body);

    if (!idResult.success || !bodyResult.success) {
      response.status(400).json({
        error: {
          code: "INVALID_GRADE_LEVEL",
          message: "학년 수정 정보를 확인해 주세요."
        }
      });
      return;
    }

    try {
      const database = getDatabase();
      const admin = getAuthenticatedLocals(response.locals);

      const gradeLevel = await database.transaction(
        async (transaction) => {
          const [existing] = await transaction
            .select()
            .from(gradeLevels)
            .where(
              and(
                eq(gradeLevels.id, idResult.data),
                isNull(gradeLevels.deletedAt)
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

          const [updated] = await transaction
            .update(gradeLevels)
            .set({
              name: nextName,
              nameNormalized: normalizeReferenceName(nextName),
              sortOrder:
                bodyResult.data.sortOrder ?? existing.sortOrder,
              isActive:
                bodyResult.data.isActive ?? existing.isActive,
              updatedBy: admin.id,
              updatedAt: new Date()
            })
            .where(eq(gradeLevels.id, existing.id))
            .returning();

          if (!updated) {
            throw new Error("학년 수정 결과를 확인할 수 없습니다.");
          }

          await transaction.insert(auditLogs).values({
            actorAdminId: admin.id,
            action:
              existing.isActive && !updated.isActive
                ? "GRADE_LEVEL_DEACTIVATED"
                : "GRADE_LEVEL_UPDATED",
            entityType: "grade_level",
            entityId: updated.id,
            metadata: {
              before: {
                name: existing.name,
                sortOrder: existing.sortOrder,
                isActive: existing.isActive
              },
              after: {
                name: updated.name,
                sortOrder: updated.sortOrder,
                isActive: updated.isActive
              }
            },
            ipAddress: request.ip,
            userAgent: request.get("user-agent")
          });

          return updated;
        }
      );

      if (!gradeLevel) {
        response.status(404).json({
          error: {
            code: "GRADE_LEVEL_NOT_FOUND",
            message: "학년 정보를 찾을 수 없습니다."
          }
        });
        return;
      }

      response.status(200).json({
        item: serializeGradeLevel(gradeLevel)
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        response.status(409).json({
          error: {
            code: "GRADE_LEVEL_NAME_ALREADY_EXISTS",
            message: "같은 이름의 활성 학년이 이미 있습니다."
          }
        });
        return;
      }

      next(error);
    }
  }
);
