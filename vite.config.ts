import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "client",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  define: {
    __BUILD_HASH__: JSON.stringify(
      process.env.RENDER_GIT_COMMIT?.slice(0, 7) ||
      process.env.GIT_COMMIT?.slice(0, 7) ||
      'local'
    ),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
