import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    ssr: path.resolve(__dirname, "workers/chat/chat_worker.ts"),
    outDir: ".vite/build",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        format: "cjs",
        inlineDynamicImports: true,
        entryFileNames: "chat_worker.js",
      },
    },
  },
});
