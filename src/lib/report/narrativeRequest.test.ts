/**
 * 서술 요청 조립 한 곳(`buildNarrativeRequest`, 판 4 라운드 계획 2.2) — 판 신호는 바탕 성적서의 찍힌 판으로만, 판 3 요청에는
 * 키가 없다, 키 순서, 앱 훅이 이 함수를 쓴다(정적 확인 — 배선은 `src/test/edition4/newRunEd4.test.tsx` 가 실제 요청으로 본다).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FactSheet } from "./buildFactSheet";
import { buildNarrativeRequest } from "./narrativeRequest";

const SHEET = { n_samples: 1, metrics: [], facts: undefined } as unknown as FactSheet;
const base = (contentSchema?: number) =>
  ({ ...(contentSchema === undefined ? {} : { contentSchema }), evalScope: { reportPurposeKey: "external" } }) as never;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildNarrativeRequest", () => {
  it("판 4 바탕이면 report_edition 4 — 키 순서 task_type · report_purpose · report_edition · fact_sheet · client_inputs", () => {
    const req = buildNarrativeRequest(base(4), { taskType: "binary", factSheet: SHEET, clientInputs: { a: 1 } });
    expect(Object.keys(req)).toEqual(["task_type", "report_purpose", "report_edition", "fact_sheet", "client_inputs"]);
    expect(req.report_edition).toBe(4);
    expect(req.report_purpose).toBe("external");
  });

  it("판 3·판 2·판 없음 바탕이면 키 자체가 없다(null 도 아님)", () => {
    for (const schema of [3, 2, undefined]) {
      const req = buildNarrativeRequest(base(schema), { taskType: "binary", factSheet: SHEET });
      expect([schema, Object.keys(req)]).toEqual([schema, ["task_type", "report_purpose", "fact_sheet"]]);
      expect(JSON.stringify(req)).not.toContain("report_edition");
    }
  });

  it("판 플래그를 읽지 않는다 — 플래그 4 여도 판 3 바탕이면 키 없음, 플래그 3 이어도 판 4 바탕이면 4", () => {
    vi.stubEnv("VITE_REPORT_EDITION", "4");
    expect(buildNarrativeRequest(base(3), { taskType: "binary", factSheet: SHEET })).not.toHaveProperty("report_edition");
    vi.stubEnv("VITE_REPORT_EDITION", "3");
    expect(buildNarrativeRequest(base(4), { taskType: "binary", factSheet: SHEET }).report_edition).toBe(4);
  });

  it("고객 입력이 없으면 client_inputs 키가 없다", () => {
    expect(buildNarrativeRequest(base(4), { taskType: "binary", factSheet: SHEET })).not.toHaveProperty("client_inputs");
  });
});

describe("요청을 조립하는 곳은 하나다(정적)", () => {
  const src = (p: string) => readFileSync(resolve(__dirname, p), "utf8");

  it("앱 훅과 계약 시험이 buildNarrativeRequest 를 쓰고, 요청 모양을 직접 적지 않는다", () => {
    const hook = src("../../hooks/useReportData.ts");
    expect(hook).toContain("buildNarrativeRequest(baseReport,");
    expect(hook).not.toMatch(/report_purpose\s*:/);
    expect(hook).not.toContain("fitNarrativePayload");
    const contract = src("./factSheetContract.test.ts");
    expect(contract).toContain("buildNarrativeRequest(base,");
    expect(contract).not.toContain("fitNarrativePayload");
  });
});
