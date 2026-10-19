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

const MIB = 1024 * 1024;

/**
 * 바이트 수를 MiB 로 적는다 — 딱 떨어지면 정수("20 MiB"), 아니면 소수 한 자리. 백엔드 413 문구의
 * `format_mib`(app/core/upload.py)와 같은 표기다(M6). 종전에는 "20MB"·영어 문구라 백엔드 문구와 단위가 갈렸다.
 */
export function formatMib(bytes: number): string {
  const mib = bytes / MIB;
  return Number.isInteger(mib) ? `${mib} MiB` : `${mib.toFixed(1)} MiB`;
}

export const MAX_UPLOAD_LABEL = formatMib(MAX_UPLOAD_BYTES);

/**
 * 상한을 넘으면 사용자에게 보여줄 사유를, 통과하면 null 을 돌려준다. 둘째 문장은 백엔드 413 문구와 같다.
 * 지금 크기는 소수 한 자리에서 **올려** 적는다 — 상한을 조금 넘은 파일이 "20.0 MiB"로 보여 상한과 같아
 * 보이지 않게.
 */
export function checkUploadSize(file: { name: string; size: number }): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    const actual = (Math.ceil((file.size / MIB) * 10) / 10).toFixed(1);
    return `파일이 너무 큽니다(${file.name}, ${actual} MiB). 평가 파일은 ${MAX_UPLOAD_LABEL} 이하만 올릴 수 있습니다.`;
  }
  return null;
}
