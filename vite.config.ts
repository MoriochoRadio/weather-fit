import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
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

/**
 * 서비스워커의 캐시 이름에 빌드 결과물의 해시를 넣는다. 캐시 이름을 손으로 올려야
 * 했을 때는 파일명이 같은 이미지·manifest를 바꿔도 옛 캐시가 계속 나갔고, 지난 배포의
 * 해시 청크가 같은 캐시에 계속 쌓였다. 내용이 같으면 해시도 같아 캐시를 쓸데없이 비우지 않는다.
 */
function serviceWorkerCacheVersion(): Plugin {
  const placeholder = "__BUILD_HASH__";
  return {
    name: "sw-cache-version",
    apply: "build",
    closeBundle() {
      const out = path.resolve(import.meta.dirname, "dist");
      const swPath = path.join(out, "service-worker.js");
      if (!fs.existsSync(swPath)) return; // 빌드가 도중에 실패한 경우 — 원래 오류를 가리지 않는다.
      const source = fs.readFileSync(swPath, "utf8");
      if (!source.includes(placeholder)) throw new Error(`service-worker.js에 ${placeholder} 자리표시자가 없습니다.`);
      const hash = createHash("sha256");
      // 404.html은 index.html의 복사본이라 뺀다(복사 순서와 무관하게 같은 해시가 나오도록).
      const files = fs.readdirSync(out, { recursive: true, encoding: "utf8" })
        .map((file) => file.split(path.sep).join("/"))
        .filter((file) => file !== "service-worker.js" && file !== "404.html" && fs.statSync(path.join(out, file)).isFile())
        .sort();
      for (const file of files) hash.update(file).update("\0").update(fs.readFileSync(path.join(out, file))).update("\0");
      fs.writeFileSync(swPath, source.replaceAll(placeholder, hash.digest("hex").slice(0, 12)));
    },
  };
}

// GitHub Pages는 /weather-fit/ 하위 경로로 서빙되고, 로컬 개발·프리뷰는 루트를 쓴다.
// 워크플로에서 GITHUB_PAGES=true로 빌드한다.
const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  base: isGitHubPagesBuild ? "/weather-fit/" : "/",
  plugins: [react(), tailwindcss(), spaFallback(), serviceWorkerCacheVersion()],
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
