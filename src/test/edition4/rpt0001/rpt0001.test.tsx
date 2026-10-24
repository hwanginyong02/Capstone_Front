/**
 * RPT-2026-0001 재생성 대조 보강(판 4 라운드 S6 ②, 계획 6절 검증 1).
 *
 * (a) "같은 입력"의 증명 — 판 4 대조에 쓰는 입력(판 3 하네스 `edition3/newRun` 의 bc_strong 입력, 시각 고정)을 **플래그 끔**으로
 *     처음부터 만든 1단계 저장 데이터(stage1)가 실제 발급 보관본 RPT-2026-0001(`archive/issued/RPT-2026-0001.content.json`, 서버
 *     보관본 바이트 그대로)과 같다. 다른 곳은 아래 명시 목록뿐이다: 서술 칸(서술이 끝나야 채워짐)과 시각 두 칸.
 *     → 이 stage1 은 판 3 정답(`edition3/newRun/golden/bc_strong.stage1.json`)과 바이트가 같고, 그 정답과 판 4 run 의 차이는
 *       `newRunEd4.test.tsx` 의 STAGE1_CHANGES 가 정해진 자리로 묶는다. 보관본 ≈ 플래그 끔 stage1 = 판 3 정답 ≈ 판 4 run 이 이어진다.
 * (b) ○ 칸 — 저장소 안 원본 CSV(`bc_strong.csv`, RPT-2026-0001 에 올린 파일 바이트 그대로)에서 시험이 직접 계산한 sha256(소문자
 *     64자)·크기(3,727바이트)와 평가 엔진 버전 "1.0.0"(백엔드 상수 — 대상 모델 버전 v2.1 이 아님)이 그린 글 세 경로(화면·인쇄·번호
 *     열기)의 해당 칸에 찍혀 있다.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { FROZEN_NOW, GOLDEN_DIR, goldenNames, runNewReport, TZ_PINNED } from "../../edition3/newRun/newRun.harness";
import { loadEd4, loadEd4Issuance } from "../render/ed4Fixtures";
import { byNumberText, printText, screenText } from "../render/renderEd4";

type Json = any;
const ARCHIVE = resolve(__dirname, "../../archive/issued/RPT-2026-0001.content.json");
const CSV = resolve(__dirname, "bc_strong.csv");

/** 두 값이 다른 자리(목록 길이가 다르면 목록 자리 하나로). */
function changedPaths(a: unknown, b: unknown, path = ""): string[] {
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const x = a as Record<string, unknown>;
    const y = b as Record<string, unknown>;
    return [...new Set([...Object.keys(x), ...Object.keys(y)])].flatMap((k) =>
      !(k in x) || !(k in y) ? [`${path}.${k}`] : changedPaths(x[k], y[k], `${path}.${k}`),
    );
  }
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.flatMap((v, i) => changedPaths(v, b[i], `${path}[${i}]`));
  return JSON.stringify(a) === JSON.stringify(b) ? [] : [path];
}

const get = (obj: Json, path: string) => path.split(".").slice(1).reduce((o, k) => (o == null ? undefined : o[k]), obj);

/* ------------------------------------------------------------------ *
 * (a) 같은 입력의 증명
 * ------------------------------------------------------------------ */

/** 서술이 끝나야 채워지는 칸 — 플래그 끔 stage1 은 비어 있고(빈 글·빈 목록·키 없음) 보관본은 서술 결과가 들어 있다. */
const NARRATIVE_PATHS = [
  ".conclusion.benchmark",
  ".conclusion.narrative",
  ".conclusion.risks",
  ".interpretation.additionalObservations",
  ".interpretation.confusionAnalysis",
  ".interpretation.distributionAnalysis",
  ".isEvaluated",
  ".narrativeModels",
  ".narrativeSections",
  ".narrativeSource",
  ".recommendationNarrative.dataQuality",
  ".recommendationNarrative.modelOps",
  ".recommendations",
];

/** 시각 두 칸 — 값까지 적는다(stage1 쪽, 보관본 쪽). */
const TIME_PATHS: Record<string, [string, string]> = {
  // 평가 응답의 평가 시각: 하네스 입력은 C 세션 실측 응답(16:23:38), 보관본은 발급 당시 평가(18:45:58).
  ".evalEnv.environment.evaluated_at": ["2026-10-22T16:23:38+09:00", "2026-10-22T18:45:58+09:00"],
  // 생성 전 안내 확인 시각: 하네스는 멈춘 시각 18:45:00 KST, 보관본은 실제 클릭 시각.
  ".materialCheck.acknowledgement.at": ["2026-10-22T09:45:00.000Z", "2026-10-22T09:45:57.953Z"],
};

describe("(a) 같은 입력의 증명 — 플래그 끔 stage1 = 보관본 RPT-2026-0001(서술 칸·시각 두 칸 제외)", () => {
  const originalTz = process.env.TZ;
  let stage1Text = "";

  beforeAll(async () => {
    process.env.TZ = TZ_PINNED;
    vi.stubEnv("VITE_REPORT_EDITION", ""); // 빈 값 = 기본값(판 3)
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(FROZEN_NOW());
    try {
      stage1Text = (await runNewReport("bc_strong")).stage1;
    } finally {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    }
  }, 60_000);
  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  const stage1 = () => JSON.parse(stage1Text);
  const archive = () => JSON.parse(readFileSync(ARCHIVE, "utf8"));

  it("판 3 으로 만들어졌다(같은 입력의 플래그 끔)", () => {
    expect(stage1().contentSchema).toBe(3);
    expect(stage1().meta.title).toBe(archive().meta.title);
  });

  it("보관본과 다른 자리 = 서술 칸 13 + 시각 2, 그 밖은 모두 같다", () => {
    const changed = changedPaths(stage1(), archive()).sort();
    expect(changed).toEqual([...NARRATIVE_PATHS, ...Object.keys(TIME_PATHS)].sort());
    expect(changed).toHaveLength(15);
  });

  it("서술 칸은 stage1 쪽이 비어 있다(서술 전), 보관본 쪽은 채워져 있다", () => {
    const empty = (v: unknown) => v === undefined || v === "" || v === false || (Array.isArray(v) && v.length === 0);
    for (const p of NARRATIVE_PATHS) {
      expect(empty(get(stage1(), p)), `stage1 ${p}`).toBe(true);
      expect(empty(get(archive(), p)), `보관본 ${p}`).toBe(false);
    }
  });

  it("시각 두 칸의 값", () => {
    for (const [p, [mine, theirs]] of Object.entries(TIME_PATHS)) {
      expect([get(stage1(), p), get(archive(), p)], p).toEqual([mine, theirs]);
    }
  });

  it("이 stage1 은 판 4 run 과 견주는 판 3 정답과 바이트가 같다(사슬의 가운데 고리)", () => {
    expect(stage1Text).toBe(readFileSync(resolve(GOLDEN_DIR, goldenNames("bc_strong").stage1), "utf8"));
  });

  it("대조군 — 보관본에서 서술 밖 칸 하나를 바꾸면 다른 자리 목록에 나타난다", () => {
    const changedArchive = archive();
    changedArchive.datasetInfo.sampleCount = (changedArchive.datasetInfo.sampleCount ?? 0) + 1;
    expect(changedPaths(stage1(), changedArchive)).toContain(".datasetInfo.sampleCount");
  });
});

/* ------------------------------------------------------------------ *
 * (b) ○ 칸 — 저장소 안 CSV 로 다시 계산한 값이 그린 글 세 경로에 찍혔다
 * ------------------------------------------------------------------ */
describe("(b) ○ 칸 — 해시·크기(저장소 안 CSV 에서 계산)·엔진 버전 1.0.0 이 세 경로에", () => {
  const bytes = readFileSync(CSV);
  const sha = createHash("sha256").update(bytes).digest("hex");

  it("CSV 바이트: sha256 소문자 64자, 3,727바이트 — 손으로 적은 RPT-2026-0001 값과 같다", () => {
    expect(sha).toMatch(/^[0-9a-f]{64}$/);
    expect(sha).toBe("4ead9f2ccc8da32c0c3148f02ea6ff4e030c156d9873eeb99883df73f3a49f9d");
    expect(bytes.length).toBe(3727);
  });

  it("발급본 픽스처의 저장값(datasetInfo.sourceFile·evalEnv.engineVersion)이 CSV 계산값·엔진 상수와 같다", () => {
    const data = loadEd4("bc_strong", "issued") as Json;
    expect(data.datasetInfo.sourceFile).toEqual({ sha256: sha, sizeBytes: bytes.length });
    expect(data.evalEnv.engineVersion).toBe("1.0.0");
    expect(data.evalScope.version).toBe("v2.1");
  });

  const paths: Array<[string, () => Promise<string>]> = [
    ["화면", async () => screenText(loadEd4("bc_strong", "issued"))],
    ["인쇄", () => printText(loadEd4("bc_strong", "issued"))],
    ["번호 열기", () => byNumberText(loadEd4("bc_strong", "final"), loadEd4Issuance("bc_strong"))],
  ];

  it.each(paths)("%s — 2.2 해시·크기 칸, 3.5 엔진 버전 칸", async (_name, draw) => {
    const lines = (await draw()).split("\n");
    const rows = (label: string) => lines.filter((l) => l.startsWith(`| ${label} |`));
    const size = `${bytes.length.toLocaleString("en-US")}바이트`;
    expect(size).toBe("3,727바이트");
    expect(rows("파일 해시(SHA-256)")).toEqual([`| 파일 해시(SHA-256) | ${sha} | 시스템 확인`]);
    expect(rows("파일 크기")).toEqual([`| 파일 크기 | ${size} | 시스템 확인`]);
    expect(rows("평가 엔진 버전")).toEqual(["| 평가 엔진 버전 | 1.0.0"]);
    // 모델 버전 v2.1 은 표지 시험 대상 칸과 2.1 대상 모델 표에만 있다(엔진 버전 자리가 아님).
    expect(lines.filter((l) => l.includes("v2.1"))).toEqual([
      "| 시험 대상 | BreastScreen-LR v2.1 | 의뢰자 | (주)시연고객",
      "| 버전 | v2.1",
    ]);
  });
});
