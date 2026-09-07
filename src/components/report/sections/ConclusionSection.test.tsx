import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConclusionSection } from "./ConclusionSection";
import type { ConclusionData } from "../../../types/finalReport.types";

/**
 * ISSUES.md C-09 · C-06 (2026-09-07 ★확정된 제품 결정 5 — 현행 유지 + 정의 명시).
 *
 * 8절에는 큰 숫자 하나가 인쇄되는데 **라벨조차 없었다**(저장소 전체를 grep 해도 인쇄
 * 문자열로서의 '종합 점수'·'달성률'·'통과율'이 0건). 독자는 그것을 모델의 정확도나
 * 신뢰도로 읽을 수 있다. 실제 정의는 "사용자가 설정한 합격 기준의 달성률"이고,
 * 데이터셋 특성 지표(M23)에 목표값을 설정했다면 그것도 분모에 들어간다 —
 * C-09 는 엣지케이스가 아니라 **기본 경로**다(M23 이 세 task 모두의 추천 지표다).
 *
 * 결정 5 는 계산을 바꾸지 않는다. 대신 그 정의를 성적서가 말하게 한다.
 */
const conclusion: ConclusionData = {
  verdict: "CONDITIONAL_PASS",
  score: 66.7,
  benchmark: "",
  narrative: "",
  risks: "",
};

describe("8절 종합 점수 — 정의 명시 (결정 5)", () => {
  it("숫자에 라벨이 붙는다", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    expect(screen.getByText("종합 점수")).toBeInTheDocument();
  });

  it("정의를 문장으로 적는다 — '합격 목표값을 설정한 항목의 달성률'", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    const definition = screen.getByText(/종합 점수의 정의/).closest("p")!;
    expect(definition.textContent).toMatch(/합격 목표값/);
    expect(definition.textContent).toMatch(/충족한 항목의 비율/);
  });

  it("분모에서 빠지는 것을 밝힌다(목표값 미설정·측정 불가)", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    const definition = screen.getByText(/종합 점수의 정의/).closest("p")!;
    expect(definition.textContent).toMatch(/측정 불가/);
    expect(definition.textContent).toMatch(/분모에서 제외/);
  });

  it("데이터셋 특성 지표도 섞일 수 있다는 사실을 밝힌다 (C-09)", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    const definition = screen.getByText(/종합 점수의 정의/).closest("p")!;
    expect(definition.textContent).toMatch(/불균형 비율|데이터셋 특성/);
    expect(definition.textContent).toMatch(/모델 성능만의 지표가\s*아닙니다/);
  });

  it("점수 값 자체는 종전 그대로 인쇄한다(결정 5 — 계산은 바꾸지 않는다)", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    expect(screen.getByText("66.7%")).toBeInTheDocument();
  });
});
