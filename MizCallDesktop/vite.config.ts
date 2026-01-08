import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Use relative paths so assets load correctly under file:// in packaged app
  base: "./",
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});

