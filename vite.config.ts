import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * GitHub Pages는 없는 경로에 자기 기본 404 페이지를 준다. 앱에 NotFound 화면이
 * 있는데도 그게 뜨지 않아, 빌드 산출물의 index.html을 404.html로 복사해
 * 앱이 직접 404를 그리도록 한다.
 */
function spaFallback(): Plugin {
  return {
    name: "spa-404-fallback",
    apply: "build",
    closeBundle() {
      const out = path.resolve(import.meta.dirname, "dist");
      const index = path.join(out, "index.html");
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(out, "404.html"));
    },
  };
}

// GitHub Pages는 /weather-fit/ 하위 경로로 서빙되고, 로컬 개발·프리뷰는 루트를 쓴다.
// 워크플로에서 GITHUB_PAGES=true로 빌드한다.
const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  base: isGitHubPagesBuild ? "/weather-fit/" : "/",
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // 앱 코드보다 훨씬 느리게 바뀌는 벤더 코드를 분리해 재방문 캐시를 유지한다.
        //
        // 벤더를 react-runtime/vendor로 더 잘게 쪼개면 Radix·cva 같은 청크가 React보다 먼저
        // 평가되면서 React.forwardRef가 undefined가 되어 화면이 통째로 죽는다. 캐시 이득보다
        // 위험이 커서 node_modules는 한 덩어리로 유지한다.
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
  },
});
