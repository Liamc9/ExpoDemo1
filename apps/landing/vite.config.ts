import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// If you deploy to a subpath, set base: "/subpath/"
// For Firebase root hosting, leave as "/".
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist" }
});
