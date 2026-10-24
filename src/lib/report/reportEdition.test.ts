/**
 * 판 플래그(판 4 라운드 계획 2.2) — 새 run 의 판을 정하는 곳은 `newRunContentSchema()` 하나이고, 그 뒤는 찍힌 판만 읽는다.
 *
 * - 값: `VITE_REPORT_EDITION` 이 꼭 "4" 일 때만 4, 없음·빈 값·"3"·"true" 는 3(계획 6절 5).
 * - 테스트 기본값은 `vitest.config.ts` 의 `test.env` 가 "3" 으로 고정한다.
 * - 정적 시험: 환경변수를 읽는 곳은 reportEdition.ts 하나, `newRunContentSchema` 를 부르는 곳은 허용 목록뿐.
 * - 매퍼: 옵션이 없으면 플래그, 옵션이 있으면 옵션(플래그와 무관). 판 3 출력은 옵션 3 과 같다.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_BASIC_INFO } from "../../types/workflow.types";
import { EDITION4_TITLE, mapWorkflowToFinalReport, type MapWorkflowToReportInput } from "./mapWorkflowToFinalReport";
import {
  EDITION4_CONTENT_SCHEMA,
  REPORT_CONTENT_SCHEMA,
  isLegacyLayout,
  usesSchema3,
  usesSchema4,
} from "./normalizeReportContent";
import { newRunContentSchema } from "./reportEdition";

const FLAG = "VITE_REPORT_EDITION";

describe("newRunContentSchema — 값이 꼭 \"4\" 일 때만 판 4", () => {
  it("테스트 기본값은 vitest.config.ts 가 고정한 \"3\" 이다", () => {
    expect(import.meta.env[FLAG]).toBe("3");
    expect(newRunContentSchema()).toBe(3);
  });

  it.each([
    ["4", 4],
    ["3", 3],
    ["", 3],
    ["true", 3],
    ["4 ", 3],
    ["04", 3],
    ["5", 3],
  ] as const)("%j → %i", (value, expected) => {
    vi.stubEnv(FLAG, value);
    expect(newRunContentSchema()).toBe(expected);
  });

  it("변수가 없으면 3", () => {
    vi.stubEnv(FLAG, undefined);
    expect(import.meta.env[FLAG]).toBeUndefined();
    expect(newRunContentSchema()).toBe(3);
  });

  it("호출될 때 읽는다 — 같은 테스트 안에서 값을 바꾸면 바로 따라간다", () => {
    expect(newRunContentSchema()).toBe(3);
    vi.stubEnv(FLAG, "4");
    expect(newRunContentSchema()).toBe(4);
    vi.stubEnv(FLAG, "3");
    expect(newRunContentSchema()).toBe(3);
  });

  it("앞 테스트가 바꾼 값은 다음 테스트로 새지 않는다(unstubEnvs)", () => {
    expect(import.meta.env[FLAG]).toBe("3");
  });
});

describe("판 번호 함수", () => {
  it("판 상수 — 지금 판은 3 그대로, 판 4 는 4", () => {
    expect(REPORT_CONTENT_SCHEMA).toBe(3);
    expect(EDITION4_CONTENT_SCHEMA).toBe(4);
  });

  it.each([
    [undefined, { legacy: true, s3: false, s4: false }],
    [1, { legacy: true, s3: false, s4: false }],
    [2, { legacy: false, s3: false, s4: false }],
    [3, { legacy: false, s3: true, s4: false }],
    [4, { legacy: false, s3: true, s4: true }],
    [5, { legacy: false, s3: true, s4: true }],
  ])("contentSchema %s", (contentSchema, expected) => {
    const content = { contentSchema };
    expect({ legacy: isLegacyLayout(content), s3: usesSchema3(content), s4: usesSchema4(content) }).toEqual(expected);
  });
});

function input(): MapWorkflowToReportInput {
  return {
    basicInfo: { ...DEFAULT_BASIC_INFO, companyName: "테스트 주식회사", modelName: "MyModel" },
    taskType: "binary",
    selectedMetricIds: ["M1", "M3"],
    metricDetails: { M1: { targetValue: "0.9" }, M3: { targetValue: "0.8" } } as never,
    uploadedFile: null,
    trainingExampleFiles: [],
    trainingUnsuitableExampleFiles: [],
    columnMapping: [],
    classLabelDescriptions: {},
    metadata: null,
  };
}

describe("mapWorkflowToFinalReport 의 판 옵션", () => {
  it("옵션이 없으면 플래그를 따른다 — 기본 3, 플래그 4 면 4", () => {
    expect(mapWorkflowToFinalReport(input()).contentSchema).toBe(3);
    vi.stubEnv(FLAG, "4");
    expect(mapWorkflowToFinalReport(input()).contentSchema).toBe(4);
  });

  it("옵션이 있으면 플래그와 무관하게 옵션", () => {
    vi.stubEnv(FLAG, "4");
    expect(mapWorkflowToFinalReport(input(), null, { contentSchema: 3 }).contentSchema).toBe(3);
    vi.stubEnv(FLAG, "3");
    expect(mapWorkflowToFinalReport(input(), null, { contentSchema: 4 }).contentSchema).toBe(4);
  });

  it("판 3 출력은 옵션 없이(플래그 3) 만든 것과 옵션 3 으로 만든 것이 같다", () => {
    expect(mapWorkflowToFinalReport(input(), null, { contentSchema: 3 })).toEqual(mapWorkflowToFinalReport(input()));
  });

  it("표지 제목: 판 4 run 만 시험성적서, 판 3 은 종전 시험결과서", () => {
    expect(mapWorkflowToFinalReport(input()).meta.title).toBe("기계학습 분류 성능 시험결과서");
    expect(EDITION4_TITLE).toBe("기계학습 분류 성능 시험성적서");
    expect(mapWorkflowToFinalReport(input(), null, { contentSchema: 4 }).meta.title).toBe(EDITION4_TITLE);
    vi.stubEnv(FLAG, "4");
    expect(mapWorkflowToFinalReport(input()).meta.title).toBe(EDITION4_TITLE);
  });
});

// ── 정적 시험: 판을 정하는 곳은 한 군데 ─────────────────────────────────────────────

const SRC = resolve(__dirname, "../..");
const ROOT = resolve(SRC, "..");
const isTestFile = (path: string) =>
  /\.(test|spec)\.tsx?$/.test(path) || /\.harness\.tsx?$/.test(path) || relative(SRC, path).startsWith(`test/`);

function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|jsx?)$/.test(name) && !isTestFile(path) ? [path] : [];
  });
}

/**
 * `newRunContentSchema` 를 부를 수 있는 곳. 매퍼(옵션 기본값)와, 지표 화면의 목적별 점검 안내(새 run 이 판 4 면 "성적서 1.3에" —
 * S6 질문 7, 화면 문구 예측용). 검증 화면 생성 전 안내(B28)는 미리 만든 성적서에 찍힌 판을 읽어 여기 없다. 그 밖은 찍힌 판
 * (`usesSchema4`)만 읽는다.
 */
const ALLOWED_CALLERS = ["lib/report/mapWorkflowToFinalReport.ts", "pages/TestItems.tsx"];

describe("판을 정하는 곳은 한 군데(정적 시험)", () => {
  const files = sourceFiles(SRC).map((path) => [relative(SRC, path).split("\\").join("/"), readFileSync(path, "utf8")] as const);

  it("앱 소스를 실제로 훑는다(자기 검문)", () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files.some(([path]) => path === "lib/report/reportEdition.ts")).toBe(true);
    expect(files.some(([path]) => path.endsWith(".test.ts"))).toBe(false);
  });

  it(`${FLAG} 는 src 에서 reportEdition.ts 에만 있다`, () => {
    const hits = files.filter(([, text]) => text.includes(FLAG)).map(([path]) => path);
    expect(hits).toEqual(["lib/report/reportEdition.ts"]);
  });

  it("import.meta.env 를 읽는 곳은 API 주소와 판 플래그 둘뿐이다", () => {
    const hits = files.filter(([, text]) => text.includes("import.meta.env")).map(([path]) => path).sort();
    expect(hits).toEqual(["lib/apiBase.ts", "lib/report/reportEdition.ts"]);
  });

  it("reportEdition 을 import 하는 곳은 허용 목록뿐이다(주석에서 이름을 부르는 것은 괜찮다)", () => {
    const importer = /\bfrom\s*["'][^"']*\/reportEdition["']|import\(\s*["'][^"']*\/reportEdition["']\s*\)/;
    const users = files.filter(([, text]) => importer.test(text)).map(([path]) => path).sort();
    expect(users).toEqual(ALLOWED_CALLERS);
    // 허용된 곳은 실제로 newRunContentSchema 를 가져다 쓴다(검사식이 import 를 놓치면 위가 빈 목록이 된다).
    for (const path of ALLOWED_CALLERS) {
      const text = files.find(([p]) => p === path)![1];
      expect(text).toMatch(/import\s*\{\s*newRunContentSchema\s*\}\s*from\s*"(?:\.\/|(?:\.\.\/)+lib\/report\/)reportEdition"/);
    }
  });

  it("플래그 이름은 저장소 설정의 테스트 기본값에도 있다(vitest.config.ts)", () => {
    const config = readFileSync(resolve(ROOT, "vitest.config.ts"), "utf8");
    expect(config).toMatch(/env:\s*\{\s*VITE_REPORT_EDITION:\s*"3"\s*\}/);
    expect(config).toMatch(/unstubEnvs:\s*true/);
  });
});
