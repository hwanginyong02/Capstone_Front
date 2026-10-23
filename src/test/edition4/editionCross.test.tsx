/**
 * 판 플래그 교차 시험(판 4 라운드 계획 2.2) — 판은 run 을 만들 때 한 번 정해 찍고, 평가·서술 요청은 **찍힌 판만** 따른다.
 *
 * - 판 3 run 을 플래그 4 상태에서 평가해도: 1단계 저장 데이터·서술 요청 원문·서술 완료 뒤 저장 데이터가 판 3 정답
 *   (`edition3/newRun/golden`, 고치지 않음)과 글자까지 같고, 요청에 `report_edition` 이 없다.
 * - 판 4 run 을 플래그 3 상태에서 평가해도: 판 4 로 조립된다(contentSchema 4, 판 4 제목, 판 4 생성값).
 *
 * 하네스(`edition3/newRun/newRun.harness.tsx`)는 판 3 정답 폴더 안이라 고치지 않는다. run 을 만드는 순간만 플래그를 바꾸려고
 * 매퍼 모듈을 감싼다 — 감싼 매퍼는 `creationFlag` 로 플래그를 바꿔 **옵션 없이**(앱과 같은 기본값 경로로) 진짜 매퍼를 부르고,
 * 끝나면 평가용 플래그(`evaluationFlag`)로 되돌린다. 감쌌는지는 횟수로 단정한다.
 * 판 4 run 은 새 백엔드 응답(`evaluateNewKeys/`, 반올림 전 값 포함)으로 평가한다 — 하네스가 읽는 평가 응답만 돌린다(`node:fs`).
 */
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const ctl = vi.hoisted(() => ({
  creationFlag: "3",
  evaluationFlag: "3",
  mapperCalls: 0,
  mapperSchemas: [] as number[],
  useNewResponses: false,
  redirected: 0,
}));

vi.mock("../../lib/report/mapWorkflowToFinalReport", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/report/mapWorkflowToFinalReport")>();
  return {
    ...actual,
    mapWorkflowToFinalReport: ((...args: Parameters<typeof actual.mapWorkflowToFinalReport>) => {
      ctl.mapperCalls += 1;
      vi.stubEnv("VITE_REPORT_EDITION", ctl.creationFlag);
      try {
        const report = actual.mapWorkflowToFinalReport(...args);
        ctl.mapperSchemas.push(report.contentSchema ?? 1);
        return report;
      } finally {
        vi.stubEnv("VITE_REPORT_EDITION", ctl.evaluationFlag);
      }
    }) as typeof actual.mapWorkflowToFinalReport,
  };
});

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const OLD = /([\\/])edition3\1newRun\1inputs\1(\w+)\.evaluate\.json$/;
  const readFileSync = ((path: unknown, ...rest: unknown[]) => {
    const m = ctl.useNewResponses && typeof path === "string" ? OLD.exec(path) : null;
    if (m) {
      ctl.redirected += 1;
      const sep = m[1];
      path = (path as string).replace(OLD, `${sep}edition4${sep}evaluateNewKeys${sep}${m[2]}.evaluate.json`);
    }
    return (actual.readFileSync as (...a: unknown[]) => unknown)(path, ...rest);
  }) as typeof actual.readFileSync;
  return { ...actual, readFileSync, default: { ...actual, readFileSync } };
});

import { readFileSync } from "node:fs";
import {
  FROZEN_NOW,
  GOLDEN_DIR,
  goldenNames,
  runNewReport,
  TAGS,
  TZ_PINNED,
  type NewRunCapture,
  type Tag,
} from "../edition3/newRun/newRun.harness";

const golden = (name: string) => readFileSync(resolve(GOLDEN_DIR, name), "utf8");

async function capture(tag: Tag, creationFlag: string, evaluationFlag: string, useNewResponses: boolean) {
  ctl.creationFlag = creationFlag;
  ctl.evaluationFlag = evaluationFlag;
  ctl.useNewResponses = useNewResponses;
  const calls = ctl.mapperCalls;
  const redirected = ctl.redirected;
  vi.stubEnv("VITE_REPORT_EDITION", evaluationFlag);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FROZEN_NOW());
  try {
    const captured = await runNewReport(tag);
    // 감싼 매퍼로 run 을 만들었다(못 감쌌으면 이 시험은 플래그를 바꾸지 않은 것이다). 평가 응답을 돌렸는지도.
    expect(ctl.mapperCalls - calls).toBeGreaterThan(0);
    expect(ctl.redirected - redirected > 0).toBe(useNewResponses);
    // 평가하는 동안 플래그는 평가용 값이었다.
    expect(import.meta.env.VITE_REPORT_EDITION).toBe(evaluationFlag);
    return captured;
  } finally {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    ctl.useNewResponses = false;
  }
}

const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = TZ_PINNED;
});
afterAll(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe.each(TAGS)("판 3 run 을 플래그 4 상태에서 평가 — %s", (tag: Tag) => {
  let captured: NewRunCapture;

  beforeAll(async () => {
    ctl.mapperSchemas = [];
    captured = await capture(tag, "3", "4", false);
  });

  it("run 은 판 3 으로 만들어졌다", () => {
    expect(ctl.mapperSchemas.length).toBeGreaterThan(0);
    expect(new Set(ctl.mapperSchemas)).toEqual(new Set([3]));
  });

  it("1단계 저장 데이터·서술 요청 원문·서술 완료 뒤 저장 데이터 = 판 3 정답", () => {
    expect(captured.stage1).toBe(golden(goldenNames(tag).stage1));
    expect(captured.request).toBe(golden(goldenNames(tag).request));
    expect(captured.final).toBe(golden(goldenNames(tag).final));
  });

  it("서술 요청에 report_edition 이 없다", () => {
    expect(captured.request.length).toBeGreaterThan(0);
    expect(JSON.parse(captured.request)).not.toHaveProperty("report_edition");
    expect(captured.request).not.toContain("report_edition");
  });
});

describe.each(TAGS)("판 4 run 을 플래그 3 상태에서 평가 — %s", (tag: Tag) => {
  let stage1: Record<string, any>;
  let final: Record<string, any>;

  beforeAll(async () => {
    ctl.mapperSchemas = [];
    const captured = await capture(tag, "4", "3", true);
    stage1 = JSON.parse(captured.stage1);
    final = JSON.parse(captured.final);
  });

  it("run 은 판 4 로 만들어졌고, 평가 뒤에도 판 4 다", () => {
    expect(ctl.mapperSchemas.length).toBeGreaterThan(0);
    expect(new Set(ctl.mapperSchemas)).toEqual(new Set([4]));
    expect(stage1.contentSchema).toBe(4);
    expect(final.contentSchema).toBe(4);
  });

  it("표지 제목은 판 4 글", () => {
    expect(stage1.meta.title).toBe("기계학습 분류 성능 시험성적서");
  });

  it("판정 대상 지표마다 판정 여유가 저장되고, 판정 대상이 아닌 지표에는 없다(S3 ③)", () => {
    const kpis: Record<string, any>[] = stage1.kpiResults;
    const judged = kpis.filter((r) => r.threshold !== null && r.status !== "unavailable");
    expect(judged.length).toBeGreaterThan(0);
    for (const r of judged) expect([r.metricId, ["small", "ample"].includes(r.judgmentMargin)]).toEqual([r.metricId, true]);
    for (const r of kpis.filter((k) => !judged.includes(k))) expect(r).not.toHaveProperty("judgmentMargin");
    // 구간이 붙은 지표는 새 응답의 반올림 전 경계를 함께 저장한다.
    const withCi = judged.filter((r) => r.ci);
    expect(withCi.length).toBeGreaterThan(0);
    for (const r of withCi) expect(r.ciRaw).toEqual({ low: expect.any(Number), high: expect.any(Number) });
  });

  if (tag === "bc_strong") {
    it("RPT-2026-0001 입력: Accuracy·Recall·F1 은 작음, AUROC·Log Loss 는 충분(계약 bc_strong 값)", () => {
      const margin = Object.fromEntries((stage1.kpiResults as any[]).map((r) => [r.metricId, r.judgmentMargin ?? null]));
      expect(margin).toEqual({
        M1: "small",
        M2: null,
        M3: "small",
        M4: "small",
        M9: "ample",
        M10: null,
        M19: "ample",
        M23: null,
      });
      const m1 = (stage1.kpiResults as any[]).find((r) => r.metricId === "M1");
      expect(m1.ciRaw).toEqual({ low: 0.9496962348678732, high: 0.9940158635836336 });
      expect(m1.ci.low).toBe(0.9497);
    });

    it("RPT-2026-0001 입력: 문제는 예시본 6절대로 P1 근소 합격(Recall, 중간)·P2 같은 출처(낮음)(S3 ④)", () => {
      expect((stage1.problems as any[]).map((p) => [p.id, p.kind, p.priority, p.title, p.source_section, p.recommend_section])).toEqual([
        ["P1", "core_near_target", "MEDIUM", "핵심 지표 근소 합격 (Recall)", "8.3", "9.2"],
        ["P2", "same_source", "LOW", "평가 데이터가 학습과 같은 출처", "8.2", "9.1"],
      ]);
    });

    it("RPT-2026-0001 입력: 재료 점검 판 4 글이 예시본 표지·1.3 글과 같다(S3 ⑤)", () => {
      const printed = stage1.materialCheck.printed;
      expect(stage1.materialCheck.version).toBe("2.0");
      expect(printed.cover).toBe("ISO/IEC TS 4213:2022에 따라 평가. 일부 보고 항목 미제공(1.3 참조)");
      expect(printed.coverRows).toEqual([
        { label: "보고 항목", value: "TS 4213 보고 항목 11개 중 10개 제공 (빠진 항목: 추론 효율성(지연시간), 1.3)" },
        { label: "주요 제약", value: "평가 데이터가 학습 데이터와 같은 출처 (5.1)" },
      ]);
      expect(printed.notProvided).toBe(
        "ISO/IEC TS 4213이 보고를 요구하는 항목 중 추론 효율성(지연시간)은 의뢰자로부터 제공받지 못해 기재하지 않았다. " +
          "따라서 본 시험성적서는 위 항목에 대해 TS 4213의 보고 요구를 충족하지 않는다.",
      );
    });
  }

  it("입력 셋 모두 '같은 출처'라 같은 출처 문제가 LOW 맨 끝에 있다(S3 ④)", () => {
    const problems: any[] = stage1.problems;
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.at(-1)).toMatchObject({ kind: "same_source", priority: "LOW", evidence: { "학습 데이터와의 관계": "같은 출처" } });
    expect(problems.filter((p) => p.kind === "same_source").length).toBe(1);
    expect(problems.map((p) => p.title).join(" ")).not.toContain("아슬아슬");
  });
});
