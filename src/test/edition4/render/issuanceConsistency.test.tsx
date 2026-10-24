/**
 * 판 4 "발급본인가" 판정은 한 곳(`render/issuance.ts`)이다 — 표지 상태 줄·고정 문구 22·문서 번호·발급 일시, 3.5 단계별 수행 일시
 * 3행(부록 B8), 끝부분 발급 이력이 같은 판정을 따라야 한 문서 안에 "발급"과 "(미발급)"이 함께 찍히지 않는다.
 * 문서 번호만 빠지고 발급 일시·이력이 남은 어긋난 데이터로, 세 자리가 모두 미발급 쪽을 찍는지 본다.
 */
import { describe, expect, it } from "vitest";
import type { FinalReportData } from "../../../types/finalReport.types";
import { B1_DRAFT_STATUS, EX_HISTORY_TITLE, EX_ISSUED_STATUS, FIXED_22_ISSUE } from "../../../lib/report/edition4/edition4Text";
import { loadEd4 } from "./ed4Fixtures";
import { screenText } from "./renderEd4";

const lines = (text: string) => text.split("\n");

describe("판 4 발급 판정 한 곳", () => {
  it("발급본: 세 자리 모두 발급 쪽", () => {
    const text = screenText(loadEd4("bc_strong", "issued"));
    expect(lines(text)).toContain(EX_ISSUED_STATUS);
    expect(text).toContain(FIXED_22_ISSUE);
    expect(lines(text)).toContain("| 확인·발급 | 의뢰자의 입력 내용 확인, 시험성적서(PDF) 자동 발급 | 2026-10-22 18:46");
    expect(lines(text)).toContain(EX_HISTORY_TITLE);
  });

  it("문서 번호가 없으면 발급 일시·이력이 남아 있어도 세 자리 모두 미발급 쪽", () => {
    const issued = loadEd4("bc_strong", "issued");
    expect(issued.meta.issuedAt).not.toBe("");
    expect((issued.signature?.history ?? []).length).toBeGreaterThan(0);
    const broken: FinalReportData = { ...issued, meta: { ...issued.meta, reportId: "" } };
    const text = screenText(broken);
    expect(lines(text)).toContain(B1_DRAFT_STATUS);
    expect(lines(text)).not.toContain(EX_ISSUED_STATUS);
    expect(text).not.toContain(FIXED_22_ISSUE);
    expect(text).not.toContain("2026-10-22 18:46");
    expect(lines(text)).not.toContain(EX_HISTORY_TITLE);
  });
});
