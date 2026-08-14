import express from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { createApp } from "./app";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const app = createApp();
const port = Number.parseInt(process.env.PORT ?? "5000", 10);

async function configureFrontend() {
  if (process.env.NODE_ENV === "production") {
    const publicDirectory = path.resolve(projectRoot, "dist/public");
    app.use(express.static(publicDirectory));
    app.use((request, response, next) => {
      if (request.method !== "GET" || request.path.startsWith("/api/")) {
        next();
        return;
      }
      response.sendFile(path.join(publicDirectory, "index.html"));
    });
    return;
  }

  const vite = await createViteServer({
    configFile: path.resolve(projectRoot, "vite.config.ts"),
    server: { middlewareMode: true },
    appType: "custom"
  });

  app.use(vite.middlewares);

  app.use(async (request, response, next) => {
    if (request.method !== "GET" || request.path.startsWith("/api/")) {
      next();
      return;
    }

    try {
      const indexPath = path.resolve(projectRoot, "client/index.html");
      const source = await readFile(indexPath, "utf-8");
      const html = await vite.transformIndexHtml(request.originalUrl, source);
      response.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

await configureFrontend();

app.listen(port, "0.0.0.0", () => {
  console.log(`Academy-Gpt 개발 서버: http://0.0.0.0:${port}`);
});
