import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const outDir = resolve(root, "dist-pages");

/** GitHub Pages serves 404.html for unknown paths. Same app, one page. */
function pages404(): Plugin {
  return {
    name: "holdline-pages-404",
    apply: "build",
    closeBundle() {
      copyFileSync(resolve(outDir, "index.html"), resolve(outDir, "404.html"));
    },
  };
}

export default defineConfig({
  // Project site: https://ecpryze.github.io/holdline/
  base: "/holdline/",
  root: resolve(root, "site"),
  envDir: root,
  publicDir: resolve(root, "public"),
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), viteReact(), pages404()],
  build: {
    outDir,
    emptyOutDir: true,
  },
});
