import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/WYSIWYG_editor_3/",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: { port: 8080, host: true },
});
