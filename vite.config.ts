import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("leaflet")) {
            return "map";
          }
          if (id.includes("@tanstack/react-query")) {
            return "query";
          }
          if (id.includes("lucide-react")) {
            return "icons";
          }
          return undefined;
        }
      }
    }
  }
});
