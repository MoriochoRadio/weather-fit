// `npm run build` 이후(postbuild) 실행 — dist/sw.js의 CACHE_NAME 플레이스홀더를 현재 커밋 해시로
// 치환해 배포마다 캐시 버전을 수동으로 올리는 걸 잊는 사고를 막는다 (QA).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const swPath = join(root, 'dist', 'sw.js');

if (!existsSync(swPath)) {
  console.error('[stamp-sw] dist/sw.js가 없습니다 — `vite build` 이후에 실행하세요.');
  process.exit(1);
}

let buildId;
try {
  buildId = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
} catch {
  // git 정보가 없는 환경(예: 압축 배포)에서도 배포마다 값이 바뀌도록 폴백
  buildId = String(Date.now());
}

const sw = readFileSync(swPath, 'utf8');
if (!sw.includes('__BUILD_ID__')) {
  console.error('[stamp-sw] dist/sw.js에서 CACHE_NAME 플레이스홀더(__BUILD_ID__)를 찾지 못했습니다.');
  process.exit(1);
}

writeFileSync(swPath, sw.replaceAll('__BUILD_ID__', buildId));
console.log(`[stamp-sw] CACHE_NAME -> weatherfit-${buildId}`);
