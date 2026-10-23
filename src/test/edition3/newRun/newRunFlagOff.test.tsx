/**
 * 판 3 새 성적서 생성 경로 고정(판 4 라운드 S0, 계획 2.5-2) — 플래그를 끈(기본값) 상태에서 새 성적서를 만들면 저장 데이터와
 * 서술 작업 요청 본문이 운영 main 코드로 뜬 정답(`golden/`)과 **글자까지** 같아야 한다.
 *
 * - 입력·정답의 출처와 다시 뜨는 법은 같은 폴더 README.md. 정답을 다시 뜨는 것은 붉은 신호다 — 코드를 고친다.
 * - 정답 파일이 없으면 실패한다(만들지 않는다). 이 파일에는 쓰는 코드가 없다.
 * - 정답 파일 자체가 바뀌지 않았는지는 `golden/SHA256SUMS` 로 한 번 더 본다.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { FROZEN_NOW, GOLDEN_DIR, goldenNames, readInputs, runNewReport, TAGS, TZ_PINNED, type NewRunCapture, type Tag } from "./newRun.harness";

const originalTz = process.env.TZ;
const golden = (name: string) => readFileSync(resolve(GOLDEN_DIR, name), "utf8");

beforeAll(() => {
  process.env.TZ = TZ_PINNED;
});

afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe.each(TAGS)("판 3 새 성적서(플래그 끔) — %s", (tag: Tag) => {
  let captured: NewRunCapture;

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FROZEN_NOW());
    try {
      captured = await runNewReport(tag);
    } finally {
      vi.useRealTimers();
    }
  });

  it("앱이 평가 한 번·작업 생성 한 번을 부르고, 조회로 서술 완료까지 간다", () => {
    expect(captured.callCounts.evaluate).toBe(1);
    expect(captured.callCounts.jobs).toBe(1);
    expect(captured.callCounts.views).toBeGreaterThanOrEqual(2);
  });

  it("입력 재구성 확인 — 앱이 보낸 평가 요청이 실측 payload 와 같다", () => {
    const inputs = readInputs(tag);
    expect(captured.evaluateData).toEqual(inputs.payload);
    expect(captured.evaluateFileName).toBe(inputs.state.file.name);
  });

  it("1단계 저장 데이터 = 정답", () => {
    expect(captured.stage1).toBe(golden(goldenNames(tag).stage1));
  });

  it("서술 작업 요청 본문 원문 = 정답", () => {
    expect(captured.request).toBe(golden(goldenNames(tag).request));
  });

  it("서술 완료 뒤 저장 데이터 = 정답", () => {
    expect(captured.final).toBe(golden(goldenNames(tag).final));
  });

  it("다시 만들기용으로 저장한 요청 = 보낸 본문, 판 3(판 4 표시 없음)", () => {
    expect(captured.storedInput).toEqual(JSON.parse(captured.request));
    expect(JSON.parse(captured.request)).not.toHaveProperty("report_edition");
    expect(JSON.parse(captured.stage1).contentSchema).toBe(3);
  });
});

describe("정답 파일 지문", () => {
  it("golden/ 의 파일 목록과 sha256 이 SHA256SUMS 와 같다", () => {
    const listed = golden("SHA256SUMS")
      .trim()
      .split("\n")
      .map((line) => line.split(/\s+/))
      .map(([sum, name]) => [name, sum]);
    const actual = readdirSync(GOLDEN_DIR)
      .filter((name) => name !== "SHA256SUMS")
      .sort()
      .map((name) => [name, createHash("sha256").update(readFileSync(resolve(GOLDEN_DIR, name))).digest("hex")]);
    expect(actual).toEqual([...listed].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
    expect(actual).toHaveLength(TAGS.length * 3);
  });
});
