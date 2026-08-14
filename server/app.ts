import express, {
  type ErrorRequestHandler,
  type Request,
  type Response
} from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { authRouter } from "./routes/auth";
import { auditRouter } from "./routes/audit";
import { toKstIsoString } from "../shared/kst";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_request: Request, response: Response) => {
    response.status(200).json({
      status: "ok",
      service: "academy-gpt",
      timezone: "Asia/Seoul",
      timestamp: toKstIsoString()
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/audit-logs", auditRouter);

  app.use("/api", (_request: Request, response: Response) => {
    response.status(404).json({
      error: {
        code: "API_NOT_FOUND",
        message: "요청한 API를 찾을 수 없습니다."
      }
    });
  });

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next
  ) => {
    console.error(error);
    response.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "서버에서 오류가 발생했습니다."
      }
    });
  };

  app.use(errorHandler);

  return app;
}
