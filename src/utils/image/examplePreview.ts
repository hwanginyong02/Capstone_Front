/**
 * 학습 데이터 예시 이미지의 인쇄용 미리보기.
 *
 * 예시 이미지는 성적서 3절에 그대로 찍히고, 성적서 데이터에 data URL 로 들어가 발급 때 서버에
 * 통째로 보관된다. 서버는 성적서 원본을 1 MiB 까지만 받는다(백엔드 `issuance/schemas.py`
 * MAX_CONTENT_BYTES — 무인증 API 라 일부러 둔 상한). 원본 사진을 그대로 넣으면 한 장으로도 넘어
 * 발급이 실패했다. 그래서 업로드할 때 인쇄에 충분한 축소본을 만든다. 성적서에 적는 크기는 원본
 * 파일의 크기 그대로다(`UploadedFileInfo.size`).
 */

/** 축소본 한 장의 목표 크기(data URL 글자 수 ≈ 바이트). */
export const PREVIEW_MAX_BYTES = 150_000;
/** 긴 변을 이 순서로 줄여 가며 목표 크기 안에 드는 첫 결과를 쓴다. */
export const PREVIEW_LONG_SIDES = [1024, 768, 512] as const;
/** 예시 미리보기 전체 합의 안내 기준 — 성적서의 나머지(보통 수십 KB)와 함께 발급 상한 안에 들게. */
export const EXAMPLE_PREVIEW_BUDGET_BYTES = 600_000;
/** 서버가 받는 성적서 원본 상한(백엔드 MAX_CONTENT_BYTES 와 같은 값). */
export const ISSUE_CONTENT_MAX_BYTES = 1_048_576;

const JPEG_QUALITY = 0.82;

/** 긴 변을 `longSide` 이하로 줄인 크기. 키우지는 않는다. */
export function fitWithin(width: number, height: number, longSide: number): { width: number; height: number } {
  const scale = Math.min(1, longSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** 예시 파일들의 미리보기 크기 합(바이트 근사). */
export function previewBytes(files: ReadonlyArray<{ previewUrl?: string }>): number {
  return files.reduce((sum, file) => sum + (file.previewUrl?.length ?? 0), 0);
}

/** JSON 으로 보냈을 때의 UTF-8 바이트 수. */
export function jsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

/**
 * 서버 상한에 걸릴지. 서버는 파이썬 `json.dumps` 기본값으로 재서 쉼표·콜론 뒤에 공백이 들어가
 * 여기 값보다 조금 크다. 그래서 5% 여유를 두고 판단한다.
 */
export function exceedsIssueLimit(value: unknown): boolean {
  return jsonBytes(value) > ISSUE_CONTENT_MAX_BYTES * 0.95;
}

/** 원본이 이미 작으면 그대로 두고, 아니면 줄일 긴 변 후보를 돌려준다(순수 — 테스트한다). */
export function needsShrink(originalDataUrlLength: number, width: number, height: number): boolean {
  return originalDataUrlLength > PREVIEW_MAX_BYTES || Math.max(width, height) > PREVIEW_LONG_SIDES[0];
}

function readAsDataUrl(file: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawJpeg(img: HTMLImageElement, width: number, height: number): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // JPEG 에는 투명이 없다 — 투명 배경은 인쇄 바탕과 같은 흰색으로.
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

/**
 * 인쇄용 미리보기 data URL. 브라우저가 그릴 수 없는 형식(HEIC 등)이면 null — 성적서에는 파일명과
 * 크기만 적힌다.
 */
export async function makeExamplePreview(file: Blob): Promise<string | null> {
  const original = await readAsDataUrl(file);
  if (!original) return null;
  const img = await loadImage(original);
  if (!img || !img.naturalWidth || !img.naturalHeight) return null;
  if (!needsShrink(original.length, img.naturalWidth, img.naturalHeight)) return original;

  let smallest: string | null = null;
  for (const side of PREVIEW_LONG_SIDES) {
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, side);
    const url = drawJpeg(img, width, height);
    if (!url) return null;
    smallest = url;
    if (url.length <= PREVIEW_MAX_BYTES) return url;
  }
  return smallest;
}
