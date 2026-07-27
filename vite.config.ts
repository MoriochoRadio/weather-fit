import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 상대 경로 빌드 — GitHub Pages 하위 경로든 다른 정적 호스팅이든 그대로 동작
  base: './',
});
