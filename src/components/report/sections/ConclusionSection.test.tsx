import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConclusionSection } from "./ConclusionSection";
import type { ConclusionData } from "../../../types/finalReport.types";

/**
 * C-09 · C-06 (2026-09-07 ★확정된 제품 결정 5 — 현행 유지 + 정의 명시).
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

describe("8절 통과율 — 정의 명시 (결정 5) · 참고 수치 (D19)", () => {
  it("숫자에 라벨이 붙는다 — 참고 수치임을 함께 적는다", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    expect(screen.getByText("통과율 (참고)")).toBeInTheDocument();
  });

  it("판정의 근거가 아니라고 밝힌다 (서술 설계 D19)", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    const definition = screen.getByText(/통과율의 정의/).closest("p")!;
    expect(definition.textContent).toMatch(/판정의 근거가 아닙니다/);
  });

  it("정의를 문장으로 적는다 — '합격 목표값을 설정한 항목의 달성률'", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    const definition = screen.getByText(/통과율의 정의/).closest("p")!;
    expect(definition.textContent).toMatch(/합격 목표값/);
    expect(definition.textContent).toMatch(/충족한 항목의 비율/);
  });

  it("분모에서 빠지는 것을 밝힌다(목표값 미설정·측정 불가)", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    const definition = screen.getByText(/통과율의 정의/).closest("p")!;
    expect(definition.textContent).toMatch(/측정 불가/);
    expect(definition.textContent).toMatch(/분모에서 제외/);
  });

  it("데이터셋 특성 지표도 섞일 수 있다는 사실을 밝힌다 (C-09)", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    const definition = screen.getByText(/통과율의 정의/).closest("p")!;
    expect(definition.textContent).toMatch(/불균형 비율|데이터셋 특성/);
    expect(definition.textContent).toMatch(/모델 성능만의 지표가\s*아닙니다/);
  });

  it("점수 값 자체는 종전 그대로 인쇄한다(결정 5 — 계산은 바꾸지 않는다)", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    expect(screen.getByText("66.7%")).toBeInTheDocument();
  });
});

/**
 * 판정 불가 — 핵심 지표가 산출되지 않았거나 판정 대상 지표가 없을 때(서술 설계 D19).
 * 종전에는 조건부 합격으로 적어 확인하지 못한 것을 합격처럼 보이게 했다.
 */
describe("8절 판정 불가", () => {
  it("판정 불가로 적는다", () => {
    render(
      <ConclusionSection conclusion={{ ...conclusion, verdict: "INCONCLUSIVE", judgedCount: 2 }} />,
    );
    expect(screen.getByText("판정 불가")).toBeInTheDocument();
  });

  it("판정 대상이 없으면 통과율을 0% 가 아니라 — 로 적는다", () => {
    render(
      <ConclusionSection
        conclusion={{ ...conclusion, verdict: "INCONCLUSIVE", score: 0, judgedCount: 0 }}
      />,
    );
    expect(screen.queryByText("0.0%")).not.toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

/** 8.1 — 참조 범위를 숫자로 찍는다(재료 목록 9절). 종전에는 AI 가 쓴 문장 안에만 나왔다. */
describe("8.1 벤치마크 참조 범위", () => {
  it("모델 값·참조 범위·위치와 출처를 표로 찍는다", () => {
    render(
      <ConclusionSection
        conclusion={{
          ...conclusion,
          benchmarkRefs: [
            {
              metric: "Accuracy",
              modelValue: 0.94,
              refLow: 0.85,
              refHigh: 0.92,
              quality: "better",
              direction: "higher",
              sourceNote: "내부 참조 기준치 v1",
            },
          ],
        }}
      />,
    );
    const table = screen.getByRole("table", { name: "벤치마크 참조 범위" });
    expect(table).toHaveTextContent("Accuracy");
    expect(table).toHaveTextContent("0.940");
    expect(table).toHaveTextContent("0.85 ~ 0.92");
    expect(table).toHaveTextContent("우수");
    expect(screen.getByText(/내부 참조 기준치 v1/)).toBeInTheDocument();
  });

  it("비교값이 없으면 표를 그리지 않는다", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    expect(screen.queryByRole("table", { name: "벤치마크 참조 범위" })).not.toBeInTheDocument();
  });
});

/**
 * 8.1 목표값·목표값 수준(설계 D31) — 서버가 목표값 키를 실은 성적서에만 열을 그린다.
 * 키가 없는 옛 성적서는 발급 당시 모양(4열) 그대로다.
 */
describe("8.1 목표값 열", () => {
  const ref = {
    metric: "Accuracy",
    modelValue: 0.94,
    refLow: 0.85,
    refHigh: 0.92,
    quality: "better",
    direction: "higher",
    sourceNote: "",
  };
  const headers = () =>
    screen
      .getByRole("table", { name: "벤치마크 참조 범위" })
      .querySelectorAll("th");
  const cellsOf = (metric: string) =>
    [...screen.getByText(metric).closest("tr")!.querySelectorAll("td")].map((td) => td.textContent);

  it("키가 있으면 목표값과 목표값 수준 열을 더한다", () => {
    render(
      <ConclusionSection
        conclusion={{
          ...conclusion,
          benchmarkRefs: [
            { ...ref, metric: "Accuracy", targetValue: 0.8, targetPosition: "below" },
            { ...ref, metric: "Recall", targetValue: 0.9, targetPosition: "within" },
            { ...ref, metric: "Precision", targetValue: 0.95, targetPosition: "above" },
          ],
        }}
      />,
    );
    expect([...headers()].map((th) => th.textContent)).toEqual([
      "지표", "모델 값", "참조 범위", "위치", "목표값", "목표값 수준",
    ]);
    expect(cellsOf("Accuracy").slice(4)).toEqual(["0.800", "범위보다 낮음"]);
    expect(cellsOf("Recall").slice(4)).toEqual(["0.900", "범위 안"]);
    expect(cellsOf("Precision").slice(4)).toEqual(["0.950", "범위보다 높음"]);
  });

  it("목표값이 없는 지표는 — 로 적는다", () => {
    render(
      <ConclusionSection
        conclusion={{
          ...conclusion,
          benchmarkRefs: [
            { ...ref, metric: "Accuracy", targetValue: 0.8, targetPosition: "below" },
            { ...ref, metric: "Recall", targetValue: null, targetPosition: null },
          ],
        }}
      />,
    );
    expect(cellsOf("Recall").slice(4)).toEqual(["—", "—"]);
  });

  it("옛 성적서(키 없음)는 열을 그리지 않는다", () => {
    render(<ConclusionSection conclusion={{ ...conclusion, benchmarkRefs: [ref] }} />);
    expect([...headers()].map((th) => th.textContent)).toEqual(["지표", "모델 값", "참조 범위", "위치"]);
    expect(screen.queryByText("목표값 수준")).not.toBeInTheDocument();
  });
});

/** 8.3 아슬아슬 지표 한 줄(서술 설계 D12) — 생성 때 저장한 문장을 그대로 찍는다. */
describe("8.3 아슬아슬 지표 표시", () => {
  const note =
    "목표값과의 차이가 목표값의 3% 미만인 지표(근소 차이): F1 Score(M4) 0.812(목표 0.800 이상, 충족).";

  it("저장된 한 줄이 있으면 8.3 리스크 요약 아래 찍는다", () => {
    render(<ConclusionSection conclusion={{ ...conclusion, risks: "리스크 서술" }} nearTargetNote={note} />);
    const line = screen.getByText(note);
    const heading = screen.getByText("기술적 취약점 및 잠재적 리스크 요약");
    // 8.3 제목과 같은 묶음 안, 제목 뒤에 있다.
    expect(heading.parentElement?.parentElement?.contains(line)).toBe(true);
    expect(heading.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("없으면(아슬아슬 지표 없음·옛 성적서) 찍지 않는다", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    expect(screen.queryByText(/근소 차이/)).not.toBeInTheDocument();
  });
});

/** 8.2 일반화 고정 문구 11a·11b — 생성 때 저장한 문장을 그대로 찍는다. */
describe("8.2 일반화 고정 문구", () => {
  const same =
    "평가 데이터는 학습 데이터와 동일한 출처에서 수집되었다. 본 결과는 동일 분포 내 성능을 나타내며, 다른 운영 환경에서의 일반화 성능을 보증하지 않는다.";

  it("저장된 문장이 있으면 8.2 총평 아래 찍는다", () => {
    render(<ConclusionSection conclusion={{ ...conclusion, narrative: "총평 서술" }} sourceRelationSentence={same} />);
    const line = screen.getByText(same);
    const heading = screen.getByText("전반적 성능 및 일반화 능력 총평");
    expect(heading.parentElement?.parentElement?.contains(line)).toBe(true);
    expect(heading.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // 8.3 묶음보다 앞이다.
    const risks = screen.getByText("기술적 취약점 및 잠재적 리스크 요약");
    expect(line.compareDocumentPosition(risks) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("없으면(답 없음·'모름'·옛 성적서) 찍지 않는다", () => {
    render(<ConclusionSection conclusion={conclusion} />);
    expect(screen.queryByText(/출처에서 수집되었다/)).not.toBeInTheDocument();
  });
});

/**
 * 판 1 보관본(운영 main 발급, `legacyLayout`)은 '종합 점수'와 그때의 정의 문장 그대로. 판 1 의 6.1 에는 판정 규칙이
 * 없어서(`showVerdictRule` 은 judgedCount 가 있을 때만) "판정 규칙은 6.1에 적었고"를 붙이면 없는 곳을 가리킨다.
 */
describe("8절 점수 라벨·정의 — 판 1 보관본은 운영 main 모양, 판 3 은 새 모양", () => {
  it("판 1 — '종합 점수'와 옛 정의, 판정 규칙·참고 수치 문장은 없다", () => {
    render(<ConclusionSection conclusion={conclusion} legacyLayout />);
    expect(screen.getByText("종합 점수")).toBeInTheDocument();
    expect(screen.queryByText("통과율 (참고)")).not.toBeInTheDocument();
    const definition = screen.getByText("종합 점수의 정의").closest("p")!;
    expect(definition.textContent!.replace(/\s+/g, " ")).toMatch(
      /이 수치는 모델 성능만의 지표가 아닙니다\. 항목별 값과 기준은 6절 표에서 확인할 수 있습니다\.$/,
    );
    expect(definition.textContent).not.toMatch(/판정 규칙|참고 수치/);
  });

  it("판 3 — '통과율 (참고)'와 판정 규칙을 가리키는 정의", () => {
    render(<ConclusionSection conclusion={{ ...conclusion, judgedCount: 3 }} schema3 legacyLayout={false} />);
    expect(screen.getByText("통과율 (참고)")).toBeInTheDocument();
    expect(screen.queryByText("종합 점수")).not.toBeInTheDocument();
    expect(screen.getByText(/통과율의 정의/).closest("p")!.textContent).toMatch(/판정 규칙은 6\.1에 적었고/);
  });
});
