import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  root: "client",
  plugins: [react()],
  server: {
    allowedHosts: [".replit.dev", ".repl.co"]
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./client/src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url))
    }
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true
  }
});
