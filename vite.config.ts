import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative paths keep the build working under the github pages subfolder,
  // the routing lives in the hash so nothing else depends on the base
  base: "./",
  plugins: [react()],
  build: {
    outDir: "build",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
  },
});
