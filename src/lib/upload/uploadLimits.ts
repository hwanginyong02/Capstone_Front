/**
 * 업로드 크기 상한 — 프론트 사전 검사.
 *
 * 백엔드가 세 업로드 라우터에 20 MiB 상한을 걸고 초과 시 413 을 낸다(ISSUES.md G-04a).
 * 프론트가 이를 모르면 사용자는 큰 파일을 전부 올린 뒤에야 거절당하고, 화면의
 * "up to 100MB" 안내는 거짓말이 된다(D-15).
 *
 * 이 상수는 백엔드 `app/core/upload.py` 의 MAX_UPLOAD_BYTES 와 **같은 값이어야 한다.**
 * 두 저장소에 사본이 생기는 것을 피할 수 없으므로(별도 배포 단위), 값이 갈리면
 * 사용자에게 보이는 증상이 "왜 거절됐는지 모르는 413"이 된다는 점을 기억할 것.
 */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "20MB";

/** 상한을 넘으면 사용자에게 보여줄 사유를, 통과하면 null 을 돌려준다. */
export function checkUploadSize(file: { name: string; size: number }): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    const actual = (file.size / (1024 * 1024)).toFixed(1);
    return `${file.name} is ${actual}MB. Evaluation files must be ${MAX_UPLOAD_LABEL} or smaller.`;
  }
  return null;
}
