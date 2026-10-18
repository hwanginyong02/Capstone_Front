/**
 * 예시 이미지 미리보기 — 발급 상한(1 MiB) 안에 들게 줄이는 규칙.
 *
 * 캔버스 그리기는 jsdom 에 없어 여기서 그리지 않는다. 크기 계산과 판단은 순수 함수로 고정하고,
 * 실제 축소는 브라우저 확인(큰 사진을 올려 발급)으로 본다.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EXAMPLE_FILE_ACCEPT,
  isAcceptedExampleFile,
  kilobytes,
  previewBudgetMessage,
  splitExampleFiles,
  EXAMPLE_PREVIEW_BUDGET_BYTES,
  ISSUE_CONTENT_MAX_BYTES,
  PREVIEW_LONG_SIDES,
  exceedsIssueLimit,
  PREVIEW_MAX_BYTES,
  fitWithin,
  jsonBytes,
  needsShrink,
  previewBytes,
} from "./examplePreview";

describe("fitWithin — 긴 변을 줄이고 비율은 지킨다", () => {
  it("가로가 긴 사진", () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 });
  });

  it("세로가 긴 사진", () => {
    expect(fitWithin(3000, 4000, 512)).toEqual({ width: 384, height: 512 });
  });

  it("작은 이미지는 키우지 않는다", () => {
    expect(fitWithin(300, 200, 1024)).toEqual({ width: 300, height: 200 });
  });
});

describe("needsShrink — 원본이 작으면 그대로 둔다", () => {
  it("작고 크기도 작은 이미지는 원본 그대로", () => {
    expect(needsShrink(PREVIEW_MAX_BYTES, 800, 600)).toBe(false);
  });

  it("용량이 크거나 긴 변이 크면 줄인다", () => {
    expect(needsShrink(PREVIEW_MAX_BYTES + 1, 800, 600)).toBe(true);
    expect(needsShrink(10_000, PREVIEW_LONG_SIDES[0] + 1, 10)).toBe(true);
  });
});

describe("예산과 발급 용량", () => {
  it("미리보기 합계는 data URL 길이의 합이다(미리보기 없는 파일은 0)", () => {
    expect(previewBytes([{ previewUrl: "a".repeat(10) }, {}, { previewUrl: "b".repeat(5) }])).toBe(15);
  });

  it("축소본 4장(최대)까지는 예산 안, 예산과 성적서 나머지는 발급 상한 안에 든다", () => {
    expect(PREVIEW_MAX_BYTES * 4).toBeLessThanOrEqual(EXAMPLE_PREVIEW_BUDGET_BYTES);
    expect(EXAMPLE_PREVIEW_BUDGET_BYTES).toBeLessThan(ISSUE_CONTENT_MAX_BYTES / 1.5);
  });

  it("JSON 바이트는 한글을 UTF-8 로 센다", () => {
    expect(jsonBytes({ a: "가" })).toBe(11); // ASCII 8 + 한글 3
  });

  it("발급 상한 판단은 서버(공백이 더 들어감)보다 엄하게 5% 여유를 둔다", () => {
    const filler = (n: number) => ({ x: "a".repeat(n) });
    expect(exceedsIssueLimit(filler(ISSUE_CONTENT_MAX_BYTES * 0.9))).toBe(false);
    expect(exceedsIssueLimit(filler(ISSUE_CONTENT_MAX_BYTES * 0.96))).toBe(true);
  });

  // 백엔드 저장소가 옆에 없으면(프론트만 받은 CI) 대조를 건너뛴다. 파일을 읽기 전에 확인해야 한다 —
  // 종전에는 readFileSync 가 먼저 예외를 내 CI 에서 실패했다.
  const backendSchemas = resolve(__dirname, "../../../../Capstone_Back/app/issuance/schemas.py");
  it.skipIf(!existsSync(backendSchemas))("발급 상한은 백엔드 MAX_CONTENT_BYTES 와 같다", () => {
    const match = readFileSync(backendSchemas, "utf-8").match(/MAX_CONTENT_BYTES\s*=\s*([\d_]+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1].replaceAll("_", ""))).toBe(ISSUE_CONTENT_MAX_BYTES);
  });
});

/** B15 — 예시 파일은 여러 개를 한 번에 받고, 이미지·CSV·JSON 이 아니면 뺀다. 용량 안내는 숫자로. */
describe("[B15] 예시 파일 형식과 용량 안내", () => {
  it("이미지·CSV·JSON 은 받고 그 밖은 뺀다 — 형식이 비어도 확장자로 본다", () => {
    expect(isAcceptedExampleFile({ name: "a.png", type: "image/png" })).toBe(true);
    expect(isAcceptedExampleFile({ name: "a.heic", type: "image/heic" })).toBe(true);
    expect(isAcceptedExampleFile({ name: "rows.CSV", type: "" })).toBe(true);
    expect(isAcceptedExampleFile({ name: "rows.txt", type: "text/csv" })).toBe(true);
    expect(isAcceptedExampleFile({ name: "a.json", type: "" })).toBe(true);
    expect(isAcceptedExampleFile({ name: "run.exe", type: "application/x-msdownload" })).toBe(false);
    expect(isAcceptedExampleFile({ name: "notes.txt", type: "text/plain" })).toBe(false);
    expect(isAcceptedExampleFile({ name: "csv", type: "" })).toBe(false);
  });

  it("나누어도 고른 순서를 지킨다", () => {
    const files = [
      { name: "b.csv", type: "text/csv" },
      { name: "x.exe", type: "" },
      { name: "a.png", type: "image/png" },
      { name: "y.zip", type: "application/zip" },
    ];
    expect(splitExampleFiles(files)).toEqual({
      accepted: [files[0], files[2]],
      rejected: [files[1], files[3]],
    });
  });

  it("파일 고르기 창의 accept 는 같은 세 형식이다", () => {
    expect(EXAMPLE_FILE_ACCEPT).toBe("image/*,.csv,.json,application/json,text/csv");
  });

  it("권장값은 600 KB(1 KB = 1,024 바이트) — 발급 상한 1,024 KB 와 같은 단위", () => {
    expect(EXAMPLE_PREVIEW_BUDGET_BYTES).toBe(614_400);
    expect(kilobytes(EXAMPLE_PREVIEW_BUDGET_BYTES)).toBe(600);
    expect(kilobytes(ISSUE_CONTENT_MAX_BYTES)).toBe(1024);
  });

  it("넘었을 때 안내에 지금 합계·권장값·발급 상한을 숫자로 적는다", () => {
    expect(previewBudgetMessage(700 * 1024)).toBe(
      "예시 이미지 미리보기가 합계 700 KB로 권장 600 KB를 넘었습니다. " +
        "성적서가 발급 용량 한도(1,024 KB)에 가까워졌으니, 발급이 막히면 예시를 몇 장 줄여 주세요.",
    );
  });
});
