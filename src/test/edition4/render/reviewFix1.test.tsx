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
