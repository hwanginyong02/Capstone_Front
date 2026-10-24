/**
 * 판 4 렌더러 검토 지적 고침(fix1) — 검토자(rv1·rv3) 재현을 옮긴 시험. 평가 전 초안은 실제 매퍼 결과(`draftEd4.ts`)로 그린다.
 */
import { describe, expect, it } from "vitest";

import { NO_PROBLEM_SENTENCE } from "../../../lib/report/reportConstants";
import { draftReport } from "./draftEd4";
import { screenText } from "./renderEd4";

const after = (text: string, head: string) => text.slice(text.indexOf(`\n${head}\n`) + 1);
const between = (text: string, head: string, next: string) => {
  const start = text.indexOf(`\n${head}\n`);
  const end = text.indexOf(`\n${next}\n`, start + 1);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  return text.slice(start + 1, end).split("\n");
};

describe("지적 1 — 평가 전 초안(문제 목록 없음)의 6절은 판 3 초안 자리표시(문제 0개 글 아님)", () => {
  for (const tag of ["bc_strong", "digits_strong", "yeast_strong"]) {
    it(tag, () => {
      const draft = draftReport(tag);
      expect(draft.problems).toBeUndefined();
      const lines = after(screenText(draft), "6. 개선 권고").split("\n");
      expect(lines.slice(0, 7)).toEqual([
        "6. 개선 권고",
        "6.1 데이터",
        "자동 서술 생성 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.",
        "6.2 모델과 운영",
        "자동 서술 생성 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.",
        "권고 항목은 자동 서술 생성 연동 시 표시됩니다.",
        "— 끝 —",
      ]);
      expect(screenText(draft)).not.toContain(NO_PROBLEM_SENTENCE);
    });
  }

  it("판 3 같은 입력 초안도 같은 자리표시 글(글자 출처 확인)", () => {
    const text = screenText(draftReport("bc_strong", "3"));
    expect(text).toContain("\n자동 서술 생성 연동 예정 — 계산된 지표를 바탕으로 한 권고가 표시됩니다.\n");
    expect(text).toContain("\n권고 항목은 자동 서술 생성 연동 시 표시됩니다.\n");
  });
});

describe("지적 2 — 평가 전 초안 3.1 합격 기준 방향은 지표 정의(낮을수록 좋음)에서", () => {
  it("bc_strong 초안: Log Loss(M19) 는 '≤ 0.100'(저장된 metricList passCriteria·판 3 초안과 같음)", () => {
    const draft = draftReport("bc_strong");
    expect(draft.kpiResults).toHaveLength(0);
    expect(draft.metricList.find((m) => m.metricId === "M19")?.passCriteria).toBe("≤ 0.100");
    const lines = between(screenText(draft), "선택 지표와 합격 기준", "3.2 시험항목과 산정식");
    expect(lines).toContain("| M19 | Log Loss | ≤ 0.100 | —");
    expect(lines).toContain("| M1 | Accuracy | ≥ 0.950 | —");
    expect(lines.filter((l) => /^\| M\d/.test(l))).toHaveLength(8);
  });

  it("yeast_strong 초안: 낮을수록 좋은 지표는 모두 ≤", () => {
    const draft = draftReport("yeast_strong");
    const lines = between(screenText(draft), "선택 지표와 합격 기준", "3.2 시험항목과 산정식").filter((l) => /^\| M\d/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    for (const metric of draft.metricList.filter((m) => m.threshold !== null && !["M21", "M22"].includes(m.metricId))) {
      const row = lines.find((l) => l.startsWith(`| ${metric.metricId} |`));
      expect(row?.split(" | ")[2]).toBe(metric.passCriteria);
    }
  });
});
