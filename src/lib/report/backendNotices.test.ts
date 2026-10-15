import { describe, it, expect } from "vitest";
import {
  collectBackendNotices,
  type BackendNotices,
} from "./backendNotices";

/**
 * ISSUES.md B-03 · B-04 · D-16 · A-12 (2026-09-07 ★작은 판단 ①).
 *
 * 백엔드는 세 종류의 안내를 **사용자 안내용이라고 명시해** 내려보낸다.
 * 프론트에는 셋 다 소비처가 없었다(`column_notes`·`available_metric_ids`·
 * `unavailable_metric_ids` 는 grep 0건, evaluate 의 `warnings` 도 참조 0건).
 *
 * 결정문은 "6단계(지금의 검증 단계) 상단에 합친다"이다 — 매핑 단계는 안내가 도착하는 순간 이미 다음 화면으로
 * 넘어가기 때문이다.
 */

const empty: BackendNotices = {};

describe("collectBackendNotices — 세 출처를 한 목록으로", () => {
  it("컬럼 분석 안내(B-03)를 싣는다", () => {
    const notices = collectBackendNotices({
      columnNotes: [
        { llm_column: "memo", matched_column: null, status: "unmapped_header", message: "제외했습니다" },
      ],
    });

    expect(notices).toHaveLength(1);
    expect(notices[0].source).toBe("columns");
    expect(notices[0].message).toContain("제외했습니다");
  });

  it("매핑 확정 경고(B-04)를 싣는다", () => {
    const notices = collectBackendNotices({
      mappingWarnings: [{ code: "MISSING_Y_PRED", message: "예측을 파생합니다" }],
    });

    expect(notices[0].source).toBe("mapping");
    expect(notices[0].message).toBe("예측을 파생합니다");
  });

  it("평가 전처리 경고(D-16)를 싣는다", () => {
    const notices = collectBackendNotices({ evaluationWarnings: ["2개 행이 제외되었습니다"] });

    expect(notices[0].source).toBe("evaluation");
  });

  it("세 출처가 함께 있으면 순서대로 합친다", () => {
    const notices = collectBackendNotices({
      columnNotes: [{ llm_column: "a", matched_column: null, status: "corrected", message: "c" }],
      mappingWarnings: [{ code: "X", message: "m" }],
      evaluationWarnings: ["e"],
    });

    expect(notices.map((n) => n.source)).toEqual(["columns", "mapping", "evaluation"]);
  });

  it("아무것도 없으면 빈 목록이다(빈 배너를 그리지 않는다)", () => {
    expect(collectBackendNotices(empty)).toEqual([]);
  });

  it("같은 문구가 중복 도착해도 한 번만 보여준다", () => {
    const notices = collectBackendNotices({
      evaluationWarnings: ["같은 경고", "같은 경고", "다른 경고"],
    });

    expect(notices).toHaveLength(2);
  });
});

// countComputableMetrics('계산 가능한 지표 N/M', 구 A-12) 테스트는 함수와 함께
// 제거했다(2026-09-19). 사유는 backendNotices.ts 의 해당 자리 주석 참조.
