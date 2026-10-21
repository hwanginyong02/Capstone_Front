/**
 * 7·8·9절의 판 3 모양(서술 라운드 세션 B) — 판 분기마다 판 3 과 옛 판(schema3 없음) 양쪽을 시험한다.
 *
 * - 7절 ※ 한 줄, 장 단위 배지 대신 칸별 화면 전용 배지(대기·실패면 없음), 7.3 추가 관찰(빈 글 → 고정 문구 15),
 *   고정 문구 7(멀티레이블), 고정 문구 9 조사, D6 표.
 * - 8.1 고정 문구 16·값 표기(6.1 과 같은 판정 자릿수).
 * - 9절 문제 0개 → 고정 문구 6 만.
 * - 빈 서술 자리표시자의 "(LLM)" 은 판 3 에서 뺀다.
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { InterpretSection } from "./InterpretSection";
import { ConclusionSection, benchmarkModelValueText, benchmarkTargetText } from "./ConclusionSection";
import { NO_PROBLEM_SENTENCE, RecommendSection } from "./RecommendSection";
import { SECTION_SOURCE_BADGE_TEXT } from "../shared/SectionSourceBadge";
import { NARRATIVE_FAILED_TEXT, NARRATIVE_PENDING_TEXT } from "../shared/narrativePlaceholder";
import {
  MULTILABEL_IMBALANCE_DEFINITION,
  NO_ADDITIONAL_OBSERVATION_TEXT,
  SECTION7_OPINION_NOTE,
} from "../../../lib/report/narrativeSectionText";
import type { NarrativeFacts } from "../../../lib/report/narrativeFacts";
import type {
  BenchmarkRef,
  ConclusionData,
  KpiResult,
  NarrativeSectionSource,
  Problem,
} from "../../../types/finalReport.types";

const OLD_CHAPTER_BADGE = "규칙 기반 자동 생성";

const interp = {
  confusionAnalysis: "7.1 글",
  distributionAnalysis: "7.2 글",
  additionalObservations: "7.3 글",
};

const SECTIONS: Record<string, NarrativeSectionSource> = {
  "7.1": "llm",
  "7.2": "fallback",
  "7.3": "fixed",
  "8.1": "fallback",
  "8.2": "llm",
  "8.3": "fixed",
  "9": "fallback",
};

const heading = (name: RegExp) => screen.getByRole("heading", { name });
/** 소절 제목이 든 줄(제목 + 배지). */
const titleRow = (name: RegExp) => heading(name).parentElement!;

describe("7절 — ※ 한 줄과 배지", () => {
  it("판 3: ※ 줄이 7절 제목 칸 바로 다음 형제이고 문구 그대로", () => {
    const { container } = render(<InterpretSection interpretation={interp} source="fallback" schema3 />);
    const h2 = container.querySelector("h2")!;
    expect(h2).toHaveTextContent("7. 정밀 분석 및 오분류 특성 진단");
    // h2 → SectionTitle 칸 → 머리 줄(flex) → 그다음 형제가 ※ 줄
    const headerRow = h2.parentElement!.parentElement!;
    expect(headerRow.nextElementSibling).toHaveTextContent(SECTION7_OPINION_NOTE);
    expect(SECTION7_OPINION_NOTE).toBe("※ 소견은 정량 지표를 바탕으로 작성된 참고 의견이며, 시험 결과에 해당하지 않습니다.");
  });

  it("옛 판: ※ 줄이 없다", () => {
    render(<InterpretSection interpretation={interp} source="fallback" />);
    expect(screen.queryByText(SECTION7_OPINION_NOTE)).toBeNull();
  });

  it("판 3: 장 단위 옛 배지는 없고, fallback 칸(7.2)에만 칸 배지 — llm·fixed 칸은 없음, 배지는 print:hidden", () => {
    render(<InterpretSection interpretation={interp} source="fallback" schema3 narrativeSections={SECTIONS} />);
    expect(screen.queryByText(OLD_CHAPTER_BADGE)).toBeNull();
    const badges = screen.getAllByText(SECTION_SOURCE_BADGE_TEXT);
    expect(badges).toHaveLength(1);
    expect(within(titleRow(/^7\.2 /)).getByText(SECTION_SOURCE_BADGE_TEXT)).toHaveClass("print:hidden");
    expect(within(titleRow(/^7\.1 /)).queryByText(SECTION_SOURCE_BADGE_TEXT)).toBeNull();
    expect(within(titleRow(/^7\.3 /)).queryByText(SECTION_SOURCE_BADGE_TEXT)).toBeNull();
  });

  it("판 3: 7.3 이 fallback 이면 7.3 옆에도", () => {
    render(
      <InterpretSection interpretation={interp} source="fallback" schema3 narrativeSections={{ ...SECTIONS, "7.3": "fallback" }} />,
    );
    expect(within(titleRow(/^7\.3 /)).getByText(SECTION_SOURCE_BADGE_TEXT)).toBeInTheDocument();
  });

  it.each(["pending", "failed"] as const)("판 3: 서술 %s 이면 낡은 칸별 출처로 배지를 그리지 않는다", (source) => {
    render(<InterpretSection interpretation={interp} source={source} schema3 narrativeSections={SECTIONS} />);
    expect(screen.queryByText(SECTION_SOURCE_BADGE_TEXT)).toBeNull();
    expect(screen.queryByText(OLD_CHAPTER_BADGE)).toBeNull();
  });

  it("옛 판: 칸별 출처가 있어도 장 단위 옛 배지 하나(print:hidden 아님 — 발급 당시처럼 인쇄에도)", () => {
    render(<InterpretSection interpretation={interp} source="fallback" narrativeSections={SECTIONS} />);
    expect(screen.queryByText(SECTION_SOURCE_BADGE_TEXT)).toBeNull();
    const old = screen.getByText(OLD_CHAPTER_BADGE);
    expect(old.closest(".print\\:hidden")).toBeNull();
  });
});

describe("7.3 추가 관찰(서술 설계 D38)", () => {
  it("판 3: 글을 7.1·7.2 와 같은 인용 모양으로", () => {
    render(<InterpretSection interpretation={interp} source="llm" schema3 />);
    const block = titleRow(/^7\.3 추가 관찰$/).parentElement!;
    const quote = block.querySelector("blockquote")!;
    expect(quote).toHaveTextContent('"7.3 글"');
    // 7.1 과 같은 모양
    const quote71 = titleRow(/^7\.1 /).parentElement!.querySelector("blockquote")!;
    expect(quote.className).toBe(quote71.className);
  });

  it("판 3: 끝난 성적서의 빈 글이면 고정 문구 15 '해당 없음'", () => {
    render(<InterpretSection interpretation={{ ...interp, additionalObservations: "" }} source="llm" schema3 />);
    const block = titleRow(/^7\.3 /).parentElement!;
    expect(NO_ADDITIONAL_OBSERVATION_TEXT).toBe("해당 없음");
    expect(within(block).getByText(NO_ADDITIONAL_OBSERVATION_TEXT)).toBeInTheDocument();
    expect(block.querySelector("blockquote")).toBeNull();
  });

  it.each([
    ["pending", NARRATIVE_PENDING_TEXT],
    ["failed", NARRATIVE_FAILED_TEXT],
  ] as const)("판 3: 서술 %s 이면 다른 칸과 같은 자리표시자(해당 없음 아님)", (source, text) => {
    render(<InterpretSection interpretation={{ ...interp, additionalObservations: "" }} source={source} schema3 />);
    const block = titleRow(/^7\.3 /).parentElement!;
    expect(within(block).getByText(text)).toBeInTheDocument();
    expect(within(block).queryByText(NO_ADDITIONAL_OBSERVATION_TEXT)).toBeNull();
  });

  it("판 3: 서술 전 초안(키 없음)은 '해당 없음'이 아니라 초안 자리표시자", () => {
    render(<InterpretSection interpretation={{ confusionAnalysis: "", distributionAnalysis: "" }} schema3 />);
    const block = titleRow(/^7\.3 /).parentElement!;
    expect(within(block).queryByText(NO_ADDITIONAL_OBSERVATION_TEXT)).toBeNull();
    expect(block).toHaveTextContent(/연동 예정/);
  });

  it("옛 판: 7.3 칸이 없다(글이 있어도)", () => {
    render(<InterpretSection interpretation={interp} source="llm" />);
    expect(screen.queryByRole("heading", { name: /추가 관찰/ })).toBeNull();
    expect(screen.queryByText(/7\.3 글/)).toBeNull();
  });
});

describe("고정 문구 7 — 다중 레이블 불균형 비율 정의(7.2 서술 앞)", () => {
  it("판 3 멀티레이블: 7.2 소절 안, 인용보다 앞", () => {
    render(<InterpretSection interpretation={interp} source="llm" schema3 taskType="multilabel" />);
    const block = titleRow(/^7\.2 /).parentElement!;
    const note = within(block).getByText(MULTILABEL_IMBALANCE_DEFINITION);
    const quote = block.querySelector("blockquote")!;
    expect(note.compareDocumentPosition(quote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(MULTILABEL_IMBALANCE_DEFINITION).toBe(
      "다중 레이블에서 불균형 비율은 레이블 등장 빈도의 최다값 대 최소값의 비로 정의한다.",
    );
  });

  it.each(["binary", "multiclass"] as const)("판 3 %s: 없음", (taskType) => {
    render(<InterpretSection interpretation={interp} source="llm" schema3 taskType={taskType} />);
    expect(screen.queryByText(MULTILABEL_IMBALANCE_DEFINITION)).toBeNull();
  });

  it("옛 판 멀티레이블: 없음", () => {
    render(<InterpretSection interpretation={interp} source="llm" taskType="multilabel" />);
    expect(screen.queryByText(MULTILABEL_IMBALANCE_DEFINITION)).toBeNull();
  });
});

describe("고정 문구 9 조사 — 판 3 만 숫자 읽는 소리로", () => {
  const derived = { method: "threshold" as const, threshold: 0.3, source_columns: ["score"], target_role: "y_pred" };
  it("판 3: 0.3을", () => {
    render(<InterpretSection interpretation={interp} derivedPrediction={derived} schema3 />);
    expect(screen.getByText(/결정 임계값 0\.3을 적용하여 산출하였다\./)).toBeInTheDocument();
  });
  it("옛 판(판 2): 0.3를 그대로", () => {
    render(<InterpretSection interpretation={interp} derivedPrediction={derived} />);
    expect(screen.getByText(/결정 임계값 0\.3를 적용하여 산출하였다\./)).toBeInTheDocument();
  });
});

describe("빈 서술 자리표시자 — 판 3 은 '(LLM)' 없이", () => {
  const blank = { confusionAnalysis: "", distributionAnalysis: "" };
  const blankConclusion: ConclusionData = { verdict: "PASS", score: 100, benchmark: "", narrative: "", risks: "" };
  const blankNarrative = { dataQuality: "", modelOps: "" };

  it("판 3: 세 절 어디에도 'LLM' 이 없고 '자동 서술 생성 연동 예정' 은 남는다", () => {
    const { container } = render(
      <>
        <InterpretSection interpretation={blank} schema3 />
        <ConclusionSection conclusion={blankConclusion} schema3 />
        <RecommendSection recommendations={[]} narrative={blankNarrative} schema3 />
      </>,
    );
    expect(container.textContent).not.toMatch(/LLM/);
    expect(screen.getAllByText(/자동 서술 생성 연동 예정/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("권고 항목은 자동 서술 생성 연동 시 표시됩니다.")).toBeInTheDocument();
  });

  it("옛 판: 종전 문구 그대로('(LLM)' 포함)", () => {
    render(
      <>
        <InterpretSection interpretation={blank} />
        <ConclusionSection conclusion={blankConclusion} />
        <RecommendSection recommendations={[]} narrative={blankNarrative} />
      </>,
    );
    expect(screen.getAllByText(/자동 서술 생성\(LLM\) 연동 예정/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("권고 항목은 자동 서술 생성(LLM) 연동 시 표시됩니다.")).toBeInTheDocument();
  });
});

const FACTS = {
  weakest_class: {
    label: "cat",
    f1: 0.41234567,
    support: 12,
    share: 0.04,
    share_text: "0.04",
    macro_f1: 0.7,
    gap_from_macro: 0.28765433,
    gap_text: "0.2877",
    low_support: true,
    far_below_macro: true,
  },
  class_share_basis: "samples",
  top_confusion_pairs: [{ actual: "cat", predicted: "dog", count: 7, share_of_errors: 0.35 }],
  prediction_bias: { unit: "per_class", rows: [{ label: "cat", predicted: 9, actual: 12, difference: -3 }] },
} as unknown as NarrativeFacts;

describe("D6 표 — 7.1 서술 아래", () => {
  it("판 3: 7.1 소절 안, 인용 다음에 최약 클래스 표", () => {
    render(<InterpretSection interpretation={interp} source="llm" schema3 taskType="multiclass" narrativeFacts={FACTS} />);
    const block = titleRow(/^7\.1 /).parentElement!;
    const table = within(block).getByRole("table", { name: "최약 클래스" });
    const quote = block.querySelector("blockquote")!;
    expect(quote.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(block).getByRole("table", { name: "최다 오분류 쌍" })).toBeInTheDocument();
  });

  it("판 3 이진: 오분류 쌍 표는 없다(다중 클래스만)", () => {
    render(<InterpretSection interpretation={interp} source="llm" schema3 taskType="binary" narrativeFacts={FACTS} />);
    expect(screen.getByRole("table", { name: "최약 클래스" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "최다 오분류 쌍" })).toBeNull();
  });

  it("판 3: 사실 값이 없으면(옛 run) 표 없음", () => {
    render(<InterpretSection interpretation={interp} source="llm" schema3 taskType="multiclass" />);
    expect(screen.queryByTestId("narrative-fact-tables")).toBeNull();
  });

  it("옛 판: 사실 값이 있어도 표 없음", () => {
    render(<InterpretSection interpretation={interp} source="llm" taskType="multiclass" narrativeFacts={FACTS} />);
    expect(screen.queryByTestId("narrative-fact-tables")).toBeNull();
  });
});

const benchmarkRef = (p: Partial<BenchmarkRef>): BenchmarkRef => ({
  metric: "Accuracy",
  modelValue: 0.8,
  refLow: 0.85,
  refHigh: 0.92,
  quality: "worse",
  direction: "higher",
  sourceNote: "내부 참조 기준치 v1",
  targetValue: 0.8,
  targetPosition: "below",
  ...p,
});

const kpi = (p: Partial<KpiResult>): KpiResult => ({
  metricId: "M1",
  name: "Accuracy",
  value: 0.7996,
  threshold: 0.8,
  status: "fail",
  higherIsBetter: true,
  ...p,
});

const conclusion: ConclusionData = {
  verdict: "FAIL",
  score: 0,
  judgedCount: 1,
  benchmark: "8.1 글",
  narrative: "8.2 글",
  risks: "8.3 글",
  benchmarkRefs: [benchmarkRef({})],
};

const SIXTEEN = "다음 지표는 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다: F-beta Score.";

describe("8절 — 칸별 배지", () => {
  it("판 3: 장 배지 없음, 8.1(fallback)에만 칸 배지", () => {
    render(<ConclusionSection conclusion={conclusion} source="fallback" schema3 narrativeSections={SECTIONS} />);
    expect(screen.queryByText(OLD_CHAPTER_BADGE)).toBeNull();
    expect(screen.getAllByText(SECTION_SOURCE_BADGE_TEXT)).toHaveLength(1);
    expect(within(titleRow(/^8\.1 /)).getByText(SECTION_SOURCE_BADGE_TEXT)).toHaveClass("print:hidden");
  });

  it("판 3: 대기 중이면 칸 배지 없음", () => {
    render(<ConclusionSection conclusion={conclusion} source="pending" schema3 narrativeSections={SECTIONS} />);
    expect(screen.queryByText(SECTION_SOURCE_BADGE_TEXT)).toBeNull();
  });

  it("옛 판: 장 배지 하나, 칸 배지 없음", () => {
    render(<ConclusionSection conclusion={conclusion} source="fallback" narrativeSections={SECTIONS} />);
    expect(screen.getByText(OLD_CHAPTER_BADGE)).toBeInTheDocument();
    expect(screen.queryByText(SECTION_SOURCE_BADGE_TEXT)).toBeNull();
  });
});

describe("8.1 고정 문구 16", () => {
  it("판 3: 8.1 소절 안, 표 바로 아래", () => {
    render(<ConclusionSection conclusion={conclusion} schema3 noBenchmarkSentence={SIXTEEN} />);
    const block = titleRow(/^8\.1 /).parentElement!;
    const sentence = within(block).getByText(SIXTEEN);
    const tableBox = within(block).getByRole("table", { name: "벤치마크 참조 범위" }).parentElement!;
    expect(tableBox.nextElementSibling).toBe(sentence);
  });

  it("판 3: 표가 없어도 8.1 소절 안에 찍는다", () => {
    const all = "선택한 지표에 내부 참조 기준치가 없어 벤치마크 비교를 하지 않았다.";
    render(<ConclusionSection conclusion={{ ...conclusion, benchmarkRefs: [] }} schema3 noBenchmarkSentence={all} />);
    expect(screen.queryByRole("table", { name: "벤치마크 참조 범위" })).toBeNull();
    expect(within(titleRow(/^8\.1 /).parentElement!).getByText(all)).toBeInTheDocument();
  });

  it("판 3: 키가 없으면 안 찍는다", () => {
    render(<ConclusionSection conclusion={conclusion} schema3 />);
    expect(screen.queryByText(/내부 참조 기준치가 없어/)).toBeNull();
  });

  it("옛 판: 키가 있어도 안 찍는다", () => {
    render(<ConclusionSection conclusion={conclusion} noBenchmarkSentence={SIXTEEN} />);
    expect(screen.queryByText(SIXTEEN)).toBeNull();
  });
});

describe("8.1 표 값 표기 — 판 3 은 6.1 과 같은 판정 자릿수", () => {
  const cells = () =>
    within(screen.getByRole("table", { name: "벤치마크 참조 범위" }))
      .getAllByRole("row")
      .slice(1)
      .map((tr) => within(tr).getAllByRole("cell").map((td) => td.textContent));

  it("판 3: 실제 미달 0.7996 은 '0.7996'(셋째 자리 0.800 은 합격으로 읽힌다), 목표값은 targetDigits", () => {
    render(
      <ConclusionSection
        conclusion={conclusion}
        schema3
        kpiResults={[kpi({})]}
        targetDigits={3}
        judgedValueDigits
      />,
    );
    expect(cells()[0][1]).toBe("0.7996");
    expect(cells()[0][4]).toBe("0.800");
  });

  it("옛 판: 종전 toFixed(3)", () => {
    render(
      <ConclusionSection
        conclusion={conclusion}
        kpiResults={[kpi({})]}
        targetDigits={3}
        judgedValueDigits
      />,
    );
    expect(cells()[0][1]).toBe("0.800");
    expect(cells()[0][4]).toBe("0.800");
  });

  it("값 함수 — 판정 대상이 아니면 셋째 자리, 같은 이름 결과가 없으면 서버 값, 자릿수 키 없으면 셋째 자리", () => {
    const ref = benchmarkRef({ metric: "Precision", modelValue: 0.4815, targetValue: null });
    const format = { kpiResults: [kpi({ name: "Precision", value: 0.48148148, threshold: null, status: "pass" })], judgedValueDigits: true };
    expect(benchmarkModelValueText(ref, format)).toBe("0.481");
    expect(benchmarkModelValueText(benchmarkRef({ metric: "MCC", modelValue: 0.0141 }), format)).toBe("0.014");
    expect(benchmarkModelValueText(benchmarkRef({}), { kpiResults: [kpi({})] })).toBe("0.800");
    expect(benchmarkModelValueText(benchmarkRef({}), { kpiResults: [kpi({})], judgedValueDigits: true })).toBe("0.7996");
    expect(benchmarkModelValueText(benchmarkRef({}), undefined)).toBe("0.800");
  });

  it("목표값 함수 — 판 3 은 targetDigits(없으면 2), 목표값 없음은 —, 옛 판은 셋째 자리", () => {
    expect(benchmarkTargetText(benchmarkRef({ targetValue: 0.855 }), { targetDigits: 3 })).toBe("0.855");
    expect(benchmarkTargetText(benchmarkRef({ targetValue: 0.855 }), {})).toBe("0.85");
    expect(benchmarkTargetText(benchmarkRef({ targetValue: null }), { targetDigits: 3 })).toBe("—");
    expect(benchmarkTargetText(benchmarkRef({ targetValue: 0 }), { targetDigits: 3 })).toBe("0.000");
    expect(benchmarkTargetText(benchmarkRef({ targetValue: 0.855 }), undefined)).toBe("0.855");
  });

  it("판 3: 표가 8.1 소절 제목 아래, 옛 판: 제목 위(발급 당시)", () => {
    const { unmount } = render(<ConclusionSection conclusion={conclusion} schema3 />);
    let h = screen.getByRole("heading", { name: /도메인 성능 벤치마크/ });
    let table = screen.getByRole("table", { name: "벤치마크 참조 범위" });
    expect(h.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    unmount();
    render(<ConclusionSection conclusion={conclusion} />);
    h = screen.getByRole("heading", { name: /도메인 성능 벤치마크/ });
    table = screen.getByRole("table", { name: "벤치마크 참조 범위" });
    expect(h.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });
});

const NARRATIVE = { dataQuality: "9.1 글", modelOps: "9.2 글" };
const PROBLEM: Problem = {
  id: "P1",
  kind: "core_fail",
  priority: "HIGH",
  title: "핵심 지표 미달 (F1 Score)",
  source_section: "8.2",
  recommend_section: "9.2",
  evidence: {},
  note: null,
};

describe("9절 — 문제 0개면 판 3 은 고정 문구 6 만", () => {
  it("판 3·문제 0개: 고정 문구 6 한 번, 9.1·9.2 서술·배지 없음", () => {
    render(
      <RecommendSection recommendations={[]} narrative={NARRATIVE} problems={[]} source="fallback" schema3 narrativeSections={SECTIONS} />,
    );
    expect(screen.getAllByText(NO_PROBLEM_SENTENCE)).toHaveLength(1);
    expect(screen.queryByText(/9\.1 글|9\.2 글/)).toBeNull();
    expect(screen.queryByRole("heading", { name: /9\.1|9\.2|데이터셋 보완|모델 고도화/ })).toBeNull();
    expect(screen.queryByText(SECTION_SOURCE_BADGE_TEXT)).toBeNull();
    expect(screen.queryByText(OLD_CHAPTER_BADGE)).toBeNull();
  });

  it("판 3·문제 있음: 9.1·9.2 서술과 9절 머리의 칸 배지 하나(9 = fallback)", () => {
    render(
      <RecommendSection recommendations={[]} narrative={NARRATIVE} problems={[PROBLEM]} source="fallback" schema3 narrativeSections={SECTIONS} />,
    );
    expect(screen.getByText(/9\.1 글/)).toBeInTheDocument();
    expect(screen.getByText(/9\.2 글/)).toBeInTheDocument();
    const badges = screen.getAllByText(SECTION_SOURCE_BADGE_TEXT);
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveClass("print:hidden");
    expect(screen.queryByText(OLD_CHAPTER_BADGE)).toBeNull();
  });

  it("판 3·문제 있음·9 = llm: 칸 배지 없음", () => {
    render(
      <RecommendSection recommendations={[]} narrative={NARRATIVE} problems={[PROBLEM]} source="llm" schema3 narrativeSections={{ ...SECTIONS, "9": "llm" }} />,
    );
    expect(screen.queryByText(SECTION_SOURCE_BADGE_TEXT)).toBeNull();
  });

  it("옛 판·문제 0개: 발급 당시처럼 9.1·9.2 서술 + 고정 문구 6 + 장 배지", () => {
    render(<RecommendSection recommendations={[]} narrative={NARRATIVE} problems={[]} source="fallback" narrativeSections={SECTIONS} />);
    expect(screen.getByText(/9\.1 글/)).toBeInTheDocument();
    expect(screen.getByText(/9\.2 글/)).toBeInTheDocument();
    expect(screen.getByText(NO_PROBLEM_SENTENCE)).toBeInTheDocument();
    expect(screen.getByText(OLD_CHAPTER_BADGE)).toBeInTheDocument();
  });

  it("판 3·문제 목록 키 없음(아주 옛 모양): 9.1·9.2 서술 그대로", () => {
    render(<RecommendSection recommendations={[]} narrative={NARRATIVE} source="llm" schema3 />);
    expect(screen.getByText(/9\.1 글/)).toBeInTheDocument();
    expect(screen.queryByText(NO_PROBLEM_SENTENCE)).toBeNull();
  });
});
