import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// GitHub Pages는 /weather-fit/ 하위 경로로 서빙되고, 로컬 개발·프리뷰는 루트를 쓴다.
// 워크플로에서 GITHUB_PAGES=true로 빌드한다.
const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  base: isGitHubPagesBuild ? "/weather-fit/" : "/",
  plugins: [react(), tailwindcss()],
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
        // 객체 형태로는 react-dom 내부 모듈이 앱 청크로 새어 들어가서 모듈 경로로 직접 가른다.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("lucide-react")) return "ui-icons";
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|wouter)[\\/]/.test(id)) {
            return "react-runtime";
          }
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
  },
});
