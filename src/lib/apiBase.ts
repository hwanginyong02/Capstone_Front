/**
 * API base URL.
 * - 프로덕션(Vercel): VITE_API_BASE_URL = "https://capstone-back-59z8.onrender.com"
 *   (빌드 시점에 주입 — Vercel 프로젝트 환경변수, 값 변경 시 재배포 필요)
 * - 로컬 dev/테스트: 미설정 → "" → 상대경로 "/api/..." 가 Vite 프록시로 전달(기존과 동일)
 */
const raw = import.meta.env.VITE_API_BASE_URL ?? "";
export const API_BASE = raw.replace(/\/+$/, ""); // 끝 슬래시 제거(중복 // 방지)

/** "/api/..." 경로 앞에 백엔드 origin 을 붙인다. */
export function apiUrl(path: string): string {
  return API_BASE + path;
}
