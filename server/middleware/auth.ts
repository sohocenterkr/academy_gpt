import type { RequestHandler } from "express";
import {
  hasPermission,
  type Permission
} from "../../shared/permissions";
import {
  getAuthenticatedAdmin,
  type AuthenticatedAdmin
} from "../services/auth/session";

function authenticationRequired(response: Parameters<RequestHandler>[1]) {
  response.status(401).json({
    error: {
      code: "NOT_AUTHENTICATED",
      message: "로그인이 필요합니다."
    }
  });
}

export const requireAuthentication: RequestHandler = async (
  request,
  response,
  next
) => {
  try {
    const admin = await getAuthenticatedAdmin(request);

    if (!admin) {
      authenticationRequired(response);
      return;
    }

    response.locals.auth = admin;
    next();
  } catch (error) {
    next(error);
  }
};

export function requirePermission(
  permission: Permission
): RequestHandler {
  return async (request, response, next) => {
    try {
      const admin = await getAuthenticatedAdmin(request);

      if (!admin) {
        authenticationRequired(response);
        return;
      }

      if (!hasPermission(admin.role, permission)) {
        response.status(403).json({
          error: {
            code: "PERMISSION_DENIED",
            message: "이 작업을 수행할 권한이 없습니다."
          }
        });
        return;
      }

      response.locals.auth = admin;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function getAuthenticatedLocals(
  locals: Record<string, unknown>
): AuthenticatedAdmin {
  const admin = locals.auth;

  if (!admin) {
    throw new Error("인증 미들웨어가 먼저 실행되어야 합니다.");
  }

  return admin as AuthenticatedAdmin;
}
