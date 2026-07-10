/**
 * 포맷팅 유틸리티
 *
 * 이 모듈은 바이트 단위의 파일 크기 등 로우(raw) 데이터를 UI에서 읽기 쉬운 문자열로
 * 변환해주는 헬퍼 함수들을 제공합니다 (예: Data Upload 스텝에서 사용).
 */
/**
 * Format file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * ISO 날짜 문자열을 ko-KR 로케일의 "YYYY. MM. DD. HH:MM" 형태로 변환한다.
 * (예: Workspace 상세의 평가 실행 생성 일시 표시)
 */
export function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
