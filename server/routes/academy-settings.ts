import { Router } from "express";
import {
  academySettings,
  auditLogs,
  type AcademySettings
} from "../../shared/schema";
import { toKstIsoString } from "../../shared/kst";
import {
  academySettingsUpdateSchema,
  isValidKoreanPhone,
  normalizePhone
} from "../../shared/validators/academy-settings";
import { getDatabase } from "../db";
import {
  getAuthenticatedLocals,
  requirePermission
} from "../middleware/auth";

export const academySettingsRouter = Router();

function serializeAcademySettings(settings: AcademySettings) {
  return {
    id: settings.id,
    academyName: settings.academyName,
    phone: settings.phoneNormalized,
    address: settings.address,
    logoMediaId: settings.logoMediaId,
    senderName: settings.senderName,
    brandColors: settings.brandColors,
    brandFonts: settings.brandFonts,
    createdAt: toKstIsoString(settings.createdAt),
    updatedAt: toKstIsoString(settings.updatedAt)
  };
}

academySettingsRouter.get(
  "/",
  requirePermission("settings:view"),
  async (_request, response, next) => {
    try {
      const database = getDatabase();
      const [settings] = await database
        .select()
        .from(academySettings)
        .limit(1);

      response.status(200).json({
        item: settings ? serializeAcademySettings(settings) : null
      });
    } catch (error) {
      next(error);
    }
  }
);


academySettingsRouter.patch(
  "/",
  requirePermission("settings:manage"),
  async (request, response, next) => {
    const parsed = academySettingsUpdateSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: "INVALID_ACADEMY_SETTINGS",
          message: "학원 기본정보를 확인해 주세요.",
          details: parsed.error.flatten()
        }
      });
      return;
    }

    if (
      parsed.data.phone !== undefined &&
      !isValidKoreanPhone(parsed.data.phone)
    ) {
      response.status(400).json({
        error: {
          code: "INVALID_PHONE",
          message: "올바른 국내 전화번호를 입력해 주세요."
        }
      });
      return;
    }

    try {
      const database = getDatabase();
      const admin = getAuthenticatedLocals(response.locals);

      const result = await database.transaction(async (transaction) => {
        const [existing] = await transaction
          .select()
          .from(academySettings)
          .limit(1);

        if (
          !existing &&
          (
            !parsed.data.academyName ||
            !parsed.data.phone ||
            !parsed.data.address ||
            !parsed.data.senderName
          )
        ) {
          return { kind: "missing_required" as const };
        }

        let saved: AcademySettings;
        let action: string;

        if (existing) {
          const [updated] = await transaction
            .update(academySettings)
            .set({
              academyName:
                parsed.data.academyName ?? existing.academyName,
              phoneNormalized:
                parsed.data.phone === undefined
                  ? existing.phoneNormalized
                  : normalizePhone(parsed.data.phone),
              address: parsed.data.address ?? existing.address,
              logoMediaId:
                parsed.data.logoMediaId === undefined
                  ? existing.logoMediaId
                  : parsed.data.logoMediaId,
              senderName:
                parsed.data.senderName ?? existing.senderName,
              brandColors:
                parsed.data.brandColors ?? existing.brandColors,
              brandFonts:
                parsed.data.brandFonts ?? existing.brandFonts,
              updatedBy: admin.id,
              updatedAt: new Date()
            })
            .returning();

          if (!updated) {
            throw new Error("학원 기본정보 수정 결과가 없습니다.");
          }

          saved = updated;
          action = "ACADEMY_SETTINGS_UPDATED";
        } else {
          const [created] = await transaction
            .insert(academySettings)
            .values({
              singletonKey: 1,
              academyName: parsed.data.academyName!,
              phoneNormalized: normalizePhone(parsed.data.phone!),
              address: parsed.data.address!,
              logoMediaId: parsed.data.logoMediaId ?? null,
              senderName: parsed.data.senderName!,
              brandColors: parsed.data.brandColors ?? {},
              brandFonts: parsed.data.brandFonts ?? {},
              updatedBy: admin.id
            })
            .returning();

          if (!created) {
            throw new Error("학원 기본정보 생성 결과가 없습니다.");
          }

          saved = created;
          action = "ACADEMY_SETTINGS_CREATED";
        }

        await transaction.insert(auditLogs).values({
          actorAdminId: admin.id,
          action,
          entityType: "academy_settings",
          entityId: saved.id,
          metadata: {
            changedFields: Object.keys(parsed.data)
          },
          ipAddress: request.ip,
          userAgent: request.get("user-agent")
        });

        return {
          kind: "saved" as const,
          settings: saved
        };
      });

      if (result.kind === "missing_required") {
        response.status(400).json({
          error: {
            code: "ACADEMY_SETTINGS_REQUIRED",
            message: "최초 저장에는 학원명, 전화번호, 주소, 발신자명이 필요합니다."
          }
        });
        return;
      }

      response.status(200).json({
        item: serializeAcademySettings(result.settings)
      });
    } catch (error) {
      next(error);
    }
  }
);
