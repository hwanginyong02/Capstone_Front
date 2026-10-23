/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// 단위 테스트 전용 설정. 앱 빌드(vite.config.ts)와 분리하고 tailwind/proxy 플러그인은
// 제외해 테스트를 가볍게 유지한다. alias(@ → src)만 앱과 동일하게 맞춘다.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    /**
     * 기본값 5초로는 전체 실행에서 느린 테스트가 간헐적으로 터진다.
     *
     * 터지는 것은 단언이 아니라 **타임아웃**이고, 같은 파일을 단독으로 돌리면 테스트당
     * 100ms 안쪽이다. 파일 47개를 병렬로 돌릴 때 jsdom 환경 구성과 모듈 임포트에 드는
     * 시간(누적 각각 200초 이상)이 워커를 굶겨서 생기는 일이다. 느린 기계에서 거짓 실패가
     * 나지 않도록 올린다 — 정말 멈춘 테스트는 늦게라도 여전히 실패한다.
     */
    testTimeout: 20000,
  },
})
